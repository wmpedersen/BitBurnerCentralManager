/** @param {NS} ns **/
import {NS} from "Bitburner";
import {Message, MessageActions, MessageHandler, Payload,} from "/Orchestrator/Class/Message";
import {
	DEBUG,
	DEFAULT_HACKING_MODE,
	HACK_TYPE_PARTIAL_THREAD,
	HACKING_CONDUCTOR,
	HACKING_SERVER,
} from "/Orchestrator/Config/Config";
import {Hack, HackedHost} from "/Orchestrator/Class/Hack";
import {MoneyHackAlgorithm} from "/Orchestrator/HackAlgorithm/MoneyHackAlgorithm";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {HackType} from "/Orchestrator/Enum/HackEnum";
import {XPHackAlgorithm} from "/Orchestrator/HackAlgorithm/XpHackAlgorithm";

const HackAlgorithm: Record<HackType,
	(ns: NS, currentHack: Hack[], hackedHost: HackedHost[]) => Hack[]> = {
	[HackType.fullMoneyHack]: MoneyHackAlgorithm,
	[HackType.quickMoneyHack]: MoneyHackAlgorithm,
	[HackType.xpHack]: XPHackAlgorithm,
};

export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')
	ns.disableLog('getHackTime')
	ns.disableLog('getServerGrowth')
	ns.disableLog('getServerMinSecurityLevel')
	ns.disableLog('getServerSecurityLevel')
	ns.disableLog('getServerMaxMoney')
	ns.disableLog('getServerMoneyAvailable')
	ns.disableLog('getServerMaxRam')
	ns.disableLog('getServerRequiredHackingLevel')
	ns.disableLog('getServerUsedRam')
	ns.disableLog('getHackingLevel')

	const mySelf: ChannelName = ChannelName.hackManager

	const messageHandler: MessageHandler = new MessageHandler(ns, mySelf)

	const messageActions: MessageActions = {
		[Action.hackDone]: hackDone,
		[Action.addHost]: addHost,
		[Action.pause]: requestPause,
		[Action.kill]: kill
	}

	const messageFilter = message => [Action.hackDone,  Action.addHost, Action.pause, Action.kill].includes(message.payload.action)

	const hackedHost: HackedHost[] = []
	let currentHackMode: HackType = DEFAULT_HACKING_MODE
	let currentHackId: number = 1
	let currentHack: Hack[] = []
	let pauseRequested: boolean = false
	let killRequested: boolean = false

	while (true) {

		if (!pauseRequested && enoughRam()) {

			await pickHack()
		}
		if (currentHack.length<1 && pauseRequested) {
			DEBUG && ns.print("Manager paused")
			await messageHandler.sendMessage(ChannelName.serverManager, new Payload(Action.hackPaused))
			await messageHandler.waitForAnswer(m => m.payload.action === Action.hackResume)
			pauseRequested = false
			DEBUG && ns.print("Manager resumed")
		}
		if (currentHack.length<1 && killRequested) {
			DEBUG && ns.print("Manager kill")
			return
		}
		// This is a 5 second "sleep"
		for (let i = 0; i < 50; i++) {
			let response: Message[] = await messageHandler.getMessagesInQueue(messageFilter)
			if (response.length > 0) {
				for (let j = 0; j < response.length; j++) {
					await messageActions[response[j].payload.action]?.(response[j])
				}
			}
			await ns.sleep(100)
		}
	}

	async function hackDone(message: Message) {
		const hack: Hack | undefined = currentHack.find(h => h.id == message.originId)
		if (hack) {
			DEBUG && ns.print("Hack " + hack.id + " on " + hack.host + " finished: " + message.payload.info)
			currentHack = currentHack.filter(h => h.id !== message.originId)
		} else {
			DEBUG && ns.print("Finished hack cannot be found!")
		}
	}

	async function addHost(message: Message) {
		let host: string = message.payload.info as string
		DEBUG && ns.print("Received new host: " + host)
		hackedHost.push(new HackedHost(ns, host))
	}

	function enoughRam(): boolean {
		return (ns.getServerMaxRam(HACKING_SERVER) - ns.getServerUsedRam(HACKING_SERVER) - ns.getScriptRam(HACKING_CONDUCTOR[currentHackMode], HACKING_SERVER)) > 0
	}

	async function pickHack() {
		DEBUG && ns.print("Picking a hack")
		let potentialHack: Hack[] = HackAlgorithm[currentHackMode](ns, currentHack, hackedHost)
		let availableThreads: number = -1
		for (let i = 0; i < potentialHack.length; i++) {
			if (!enoughRam()) return

			if (availableThreads < 0) {
				availableThreads = await getAvailableThreads() as number
				DEBUG && ns.print("Available threads: " + availableThreads)
			}

			if (availableThreads <= 0) {
				DEBUG && ns.print("No threads available")
				break
			}

			const topHack: Hack = potentialHack[i]
			const neededThreads: number = topHack.hackType === HackType.fullMoneyHack ? topHack.hackThreads + topHack.growThreads + topHack.weakenThreads : topHack.hackThreads

			if (neededThreads <= availableThreads || (HACK_TYPE_PARTIAL_THREAD.includes(topHack.hackType) && availableThreads)) {
				// Start the hack
				await startHack(topHack)
				// Find and remove other potential hack for this host
				potentialHack = potentialHack.filter(hack => hack.host != topHack.host)
				availableThreads = await getAvailableThreads() as number
			}
		}
		if (currentHack.length < 1) {
			DEBUG && ns.print("No available hack")
		}
	}

	async function getAvailableThreads() {
		// Get available threads amount
		DEBUG && ns.print("Getting available threads.")
		const messageFilter: (m: Message) => boolean = m => m.payload.action === Action.threadsAvailable
		await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.getThreadsAvailable))
		const response: Message[] = await messageHandler.waitForAnswer(messageFilter)
		return response[0].payload.info
	}

	async function startHack(hack: Hack) {
		DEBUG && ns.print("Sending " + hack.hackType + " hack to " + hack.host)
		let executed: number = 0
		for (let i = 0; i < 50; i++) {
			executed = ns.exec(HACKING_CONDUCTOR[hack.hackType], HACKING_SERVER, 1, JSON.stringify(hack), currentHackId)
			if (executed > 0) {
				break
			}
			await ns.sleep(100)
		}
		if (executed === 0) {
			DEBUG && ns.print("Unable to start hack")
			return
		}
		hack.id = currentHackId
		currentHack.push(hack)
		// Awaiting hack to start before continuing, could probably be skipped when everything is more stable
		let messageFilter: (m: Message) => boolean = (m) => m.payload.action === Action.hackReady
		const response: Message[] = await messageHandler.waitForAnswer(messageFilter)
		if (response[0].payload.info === -1) {
			DEBUG && ns.print("Unable to start hack, lack of threads")
			return
		}
		currentHackId++
		return
	}

	async function requestPause(message: Message) {
		DEBUG && ns.print("Pause requested")
		pauseRequested = true
		//for(let j=0; j<currentHack.length; j++) {
		//	await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.stop), currentHack[j].id)
		//}
	}

	async function kill(message: Message) {
		DEBUG && ns.print("Kill requested")
		pauseRequested = true
		killRequested = true
		for(let j=0; j<currentHack.length; j++) {
			await messageHandler.sendMessage(ChannelName.hackConductor, new Payload(Action.kill), currentHack[j].id)
		}
	}
}


