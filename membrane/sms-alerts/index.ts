/**
 * `nodes` contains any nodes you add from the graph (connections).
 * `root` is a reference to this program's root node.
 */
import { nodes, root } from "membrane";

/**
 * TODO: 
 * 1. Configure your phone number by clicking `sms` in the Navigator then selecting `configure`.
 * 2. Test the `sendCheck` action by manually invoking it: press the "Invoke ►" button above the fn signature.
 * 3. Set up a cron to invoke the `sendCheck` action:
 *    a. Select `sms-alerts` in the Navigator (left sidebar).
 *    b. Click the clock icon then "Invoke at schedule...", e.g. `0 0 9 * * *` for 9am Mon-Fri.
 */
export async function sendText() {
  await nodes.sms.send({ message: "Write more Membrane programs!" });
}

/**
 * TODO: 
 * Trigger the `sendCheck` action by visiting this program's HTTP endpoint:
 * Right click `sms-alerts` in the Navigator (left sidebar), then select "Open Endpoint URL".
 */
export async function endpoint(req) {
  await root.sendText();
}
