// `nodes` contains any nodes you add from the graph (connections).
// `state` is an object that persists across program updates.
import { nodes, state } from "membrane";

export interface State {
  // Store the latest github repo release id on `state.lastReleaseId`.
  lastReleaseId: string;
}

// TODO: Test the `check` action by manually invoking it: press the "Invoke ►" button above the fn signature.
// TODO: Set up a cron:
// 1. Select `github-repo-release-monitor` in the Navigator (left sidebar).
// 2. Click the clock icon then "Invoke at schedule...", e.g. `0 0 9 * * 2-6` for 9am Mon-Fri.
export async function check() {
  const vscodeReleases = await nodes.vscode.releases.page().items.$query("{ id }");
  const id = vscodeReleases[0]?.id?.toString();
  
  if (state.lastReleaseId !== id) {
    // Store the new release id on state for subsequent runs.
    state.lastReleaseId = id;

    // Fetch the new release name and url from github.
    // TODO: Update the `vscode` program connection to a repo of your choosing:
    // 1. Click the vscode gref ("graph reference") in the CONFIG panel (bottom left) under CONNECTIONS.
    // 2. Modify the args for your repo, then drag the circle to the left of the gref down to CONNECTIONS.
    const newRelease = await nodes.vscode.releases.one({ id }).$query("{ name, html_url }");
    const text = `*New VS Code release*\n${newRelease.name}\n${newRelease.html_url}`;
    
    // TODO: Choose your preferred alert channel.
    // Email is easiest since the `email` program is already installed and configured in your workspace.
    // We already added `email` as a program connection, but you can remove it if you prefer another method.
    // Right-click a connection in the CONFIG panel (bottom left) and select "Remove" to remove it.
    await nodes.email.send({ subject: "New VS Code release", body: text });

    // Text is also easy since the `sms` program comes installed.
    // Configure your phone number by clicking `sms` in the Navigator then selecting `configure`.
    // We already added `sms` as a connection, but you can remove it if you prefer another method.
    // await nodes.sms.send({ message: text });

    // Slack requires installing the `slack` driver, configuring it with an API bot token, and creating a Slack app.
    // You'll also have to add `slack` as a connection to this program.
    // await nodes.slack.channels.one({ id: "TODO: add your channel id" }).sendMessage({ text });

    // Discord requires installing the `discord` driver and configuring an API token.
    // You'll also have to add `discord` as a connection to this program.
    // const guild = await nodes.discord.guilds.one({ id: "TODO: add your guild id" });
    // const channel = await guild.channels.one({ id: "TODO: add your channel id" });
    // await channel.sendMessage({ content: text });
  }
}
