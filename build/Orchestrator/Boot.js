/** @param {NS} ns **/
import { BASE_DIR, BOOT_SCRIPTS, DEBUG, HACKING_SERVER, MANAGER_SCRIPTS, MANAGING_SERVER } from "/Orchestrator/Config/Config";
import { Action, ChannelName } from "/Orchestrator/Enum/MessageEnum";
import { MessageHandler, Payload } from "/Orchestrator/Class/Message";
export async function main(ns) {
    const option = ns.args[0];
    let scriptList = BOOT_SCRIPTS;
    const messageHandler = new MessageHandler(ns, ChannelName.bootScript);
    if (option === "no-server-manager")
        scriptList = scriptList.filter(s => s !== ChannelName.serverManager);
    if (MANAGING_SERVER !== "home") {
        await ns.scp(ns.ls("home", BASE_DIR), "home", MANAGING_SERVER);
        ns.tprint("Copying " + ns.ls("home", BASE_DIR).length + " files to " + MANAGING_SERVER);
    }
    if (HACKING_SERVER !== "home") {
        await ns.scp(ns.ls("home", BASE_DIR), "home", HACKING_SERVER);
        ns.tprint("Copying " + ns.ls("home", BASE_DIR).length + " files to " + HACKING_SERVER);
    }
    for (let i = 0; i < scriptList.length; i++) {
        DEBUG && ns.tprint("Starting " + scriptList[i]);
        ns.exec(MANAGER_SCRIPTS[scriptList[i]], MANAGING_SERVER);
        await ns.sleep(100);
    }
    for (const server of ns.getPurchasedServers()) {
        await messageHandler.sendMessage(ChannelName.threadManager, new Payload(Action.updateHost, server));
    }
}
