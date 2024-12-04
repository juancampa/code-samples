/**
 * Minimal example using GitHub's Webhook feature to send a message to a Discord channel whenever a commit is made to a specific GitHub repository.
 */
import { nodes, root, state } from "membrane";

export const Root = {
  status: () => {
    if (!state.discordUrl && !state.repository) {
      return "Please set the Discord url and Repository with [configure](:configure)";
    } else {
      return "Ready";
    }
  },
};

export async function configure({ discordUrl, repo }) {
  const [user, repository] = repo.split("/");
  if (!discordUrl) {
    throw new Error("Discord webhook url is required");
  }
  if (!user || !repository) {
    throw new Error("repo is required with format user/repository");
  }

  // save discord webhook url and repo/user to state
  state.discordUrl = discordUrl;
  state.repository = repository;
  state.user = user;

  await nodes.github.users
    .one({ name: user })
    .repos.one({ name: repository })
    .pushed.$subscribe(root.handleCommit);
}

export async function handleCommit(_, { event }) {
  const res = await event.commit.$query(`{ message, html_url, author }`);

  const body = {
    username: "Github alert",
    avatar_url:
      "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    content: `${res.author} pushed to ${state.user}/${state.repository}: \n - ${res.message} (${res.html_url})`,
  };

  await fetch(state.discordUrl, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
