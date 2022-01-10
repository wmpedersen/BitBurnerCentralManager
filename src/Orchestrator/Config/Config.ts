import {HackType, RequiredScript} from "/Orchestrator/Enum/HackEnum";
import {Action, ChannelName} from "/Orchestrator/Enum/MessageEnum";
import {Message} from "/Orchestrator/Class/Message";

export const DEBUG: boolean = true

export const MANAGING_SERVER: string = "home"
export const HACKING_SERVER: string = "home"
export const BASE_DIR: string = "/Orchestrator/"

export const HACKING_SCRIPTS: Record<RequiredScript, string> = {
    [RequiredScript.hack]: "/Orchestrator/HackScript/hack.ns",
    [RequiredScript.weaken]: "/Orchestrator/HackScript/weaken.ns",
    [RequiredScript.grow]: "/Orchestrator/HackScript/grow.ns",
}

export const MANAGER_SCRIPTS: Partial<Record<ChannelName, string>> = {
    [ChannelName.messageManager]: "/Orchestrator/Manager/MessageManager.ns",
    [ChannelName.threadManager]: "/Orchestrator/Manager/ThreadManager.ns",
    [ChannelName.hackManager]: "/Orchestrator/Manager/HackManager.ns",
    [ChannelName.targetManager]: "/Orchestrator/Manager/TargetManager.ns",
    [ChannelName.serverManager]: "/Orchestrator/Manager/ServerManager.ns"
}

export const HACKING_CONDUCTOR: Record<HackType, string> = {
    [HackType.fullMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.quickMoneyHack]: "/Orchestrator/HackConductor/MoneyHackConductor.ns",
    [HackType.xpHack]: "/Orchestrator/HackConductor/XpHackConductor.ns",
}

export const IMPORT_TO_COPY: string[] = [
    "/Orchestrator/Class/Message.ns",
    "/Orchestrator/Enum/MessageEnum.ns"
]

export const DEFAULT_HACKING_MODE: HackType = HackType.fullMoneyHack

export const HACK_TYPE_PARTIAL_THREAD: HackType[] = [HackType.quickMoneyHack]

export const SERVER_INITIAL_RAM: number = 8

export const BOOT_SCRIPTS: string[] = [
    ChannelName.messageManager,
    ChannelName.threadManager,
    ChannelName.hackManager,
    ChannelName.targetManager,
    ChannelName.serverManager
]

export const KILL_MESSAGE: (m: Message) => boolean = m => m.payload.action === Action.kill

export const PORT_CRACKER = [
    {file: "BruteSSH.exe", function: 'brutessh'},
    {file: "FTPCrack.exe", function: 'ftpcrack'},
    {file: "relaySMTP.exe", function: 'relaysmtp'},
    {file: "HTTPWorm.exe", function: 'httpworm'},
    {file: "SQLInject.exe", function: 'sqlinject'},
];

export const MIN_HACK_CHANCE: number = 0.5