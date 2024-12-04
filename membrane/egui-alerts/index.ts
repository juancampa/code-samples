import { nodes, state } from "membrane";

export interface State {
  lastReleaseId: string;
}

export async function check() {
  const eguiReleases = await nodes.egui.releases.page().items.$query("{ id }");
  const id = eguiReleases[0]?.id?.toString();
  
  if (state.lastReleaseId !== id) {
    const release = await nodes.egui.releases.one({ id }).$query("{ name, html_url }");
    const text = `*New egui release*\n${release.name}\n${release.html_url}`;
    await nodes.slack.sendMessage({ text });
    state.lastReleaseId = id;
  }
}
