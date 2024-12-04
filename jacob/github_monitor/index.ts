// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, root, state } from "membrane";

if (!state.comment_listeners) {
  state.comment_listeners = new Map();
}
if (!state.open_issue_alerts) {
  state.open_issue_alerts = new Map();
}
if (!state.review_requested_alerts) {
  state.review_requested_alerts = new Map();
}
if (!state.review_reminders) {
  state.review_reminders = new Map();
}

//set up a listener for an org
export async function configure_org({ org }) {
  console.log(org);
  await nodes.github.organizations
    .one({ name: org })
    .commentCreated.$subscribe(root.handle_comment);
  await nodes.github.organizations
    .one({ name: org })
    .reviewRequested.$subscribe(root.handle_reviewrequested);
  await nodes.github.organizations
    .one({ name: org })
    .reviewCreated.$subscribe(root.handle_reviewrequested);
  root.send_open_issues.$cron("0 0 11 * * *");
  root.timer_remind_review.$cron("0 0 16 * * *");
  root.timer_remind_review.$cron("0 0 13 * * *");
}

//allows a user to listen for comments on their PRs (for all orgs whose comment events are subscribed to)
export async function user_listen_comments({ github_name, slack_id }) {
  state.comment_listeners.set(github_name, slack_id);
}

export async function user_alert_open_issues({ owner, repo, slack_id }) {
  repo = nodes.github.users.one({ name: owner }).repos.one({ name: repo });
  state.open_issue_alerts.get(repo)
    ? state.open_issue_alerts.get(repo).push(slack_id)
    : state.open_issue_alerts.set(repo, [slack_id]);
}

export async function user_alert_review_requested({ github_name, slack_id }) {
  state.review_requested_alerts.set(github_name, slack_id);
}

export async function send_open_issues() {
  for (let [repo, value] of state.open_issue_alerts.entries()) {
    const issues = await repo.issues.page.items.$query(
      "{ number title user { login } }"
    );
    const issues_text = issues
      .map((issue) => `#${issue.number} ${issue.title} by ${issue.user.login}`)
      .join("\n");
    await Promise.all(
      state.open_issue_alerts.get(repo).map(async (user) => {
        const { name } = await repo.$query("{ name }");
        await nodes.slack.users.one({ id: user }).sendMessage({
          text: `10 most recent open issues for ${name}\n${issues_text}`,
        });
      })
    );
  }
}

export async function handle_comment(_, { event }) {
  const username = await event.comment.$pop().$pop().user.login;
  const listener = state.comment_listeners?.get(username);
  if (listener) {
    await nodes.slack.users.one({ id: listener }).sendMessage({
      text: `New comment for ${username}: ${await event.comment.body}`,
    });
  }
}

export async function handle_reviewrequested(_, { event }) {
  const reviewer = await event.requestedReviewer.login;
  const pullRequest = await event.pullRequest;
  const { title, url } = await pullRequest.$query("{ title url }");
  const owner = await pullRequest.owner;
  const { login } = await owner.$query("{ login }");
  const slack_id = state.review_requested_alerts.get(reviewer);

  if (slack_id) {
    //handle alerting about requested reviews
    await nodes.slack.users.one({ id: slack_id }).sendMessage({
      text: `Your review has been requested for the following Pull Request: ${title} by ${login} found at ${url}`,
    });

    //handle reminding about requested reviews
    const requested_reviewers = state.review_reminders.get(pullRequest);
    if (requested_reviewers) {
      requested_reviewers.set(reviewer, new Date());
    } else {
      state.review_reminders.set(
        pullRequest,
        new Map([[reviewer, new Date()]])
      );
    }
  }
}

export async function handle_reviewsubmitted(_, { event }) {
  const pr = await event.pullRequestReview;
  const reviewer = await pr.user;

  //handle removing review request from reminder map
  state.review_reminders.get(pr).delete(reviewer);
  if (state.review_reminders.get(pr).size === 0) {
    //clean up pr if no requested reviewers are left
    state.review_reminders.delete(pr);
  }
}

export async function timer_remind_review(_, { event }) {
  const current_time = new Date();
  for (let [key, valueMap] of state.review_reminders) {
    console.log(`Key: ${key}`);

    // Loop through the Set
    for (let [subkey, subvalue] of valueMap) {
      console.log(`  Value: ${subkey}`);
      if (
        Math.abs(current_time.getTime() - subvalue.getTime()) /
        (24 * 60 * 60 * 1000)
      ) {
        const slack_id = state.review_requested_alerts.get(subkey);
        const pullRequest = await key;
        const { title, url } = await pullRequest.$query("{ title url }");
        const owner = await pullRequest.owner;
        const { login } = await owner.$query("{ login }");
        console.log("id", slack_id);
        await nodes.slack.users.one({ id: slack_id }).sendMessage({
          text: `The following pull request is awaiting your review: ${title} by ${login} found at ${url}`,
        });
      }
    }
  }
}

export async function test_func() {
  const test_thing = nodes.github.organizations
    .one({ name: "fractal-bootcamp" })
    .repos.one({ name: "directoryNY" })
    .pull_requests.one({ number: 1 });
}
