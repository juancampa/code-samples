import { state, root } from "membrane";

async function api(
  method: "GET" | "POST",
  path: string,
  query?: any,
  body?: string | object
) {
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }
  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  return await fetch(`https://slack.com/api/${path}${querystr}`, {
    method,
    body: typeof body === "object" ? JSON.stringify(body) : body,
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
  });
}

export const Root = {
  configure: async (args) => {
    state.token = args.apiToken;
    let res = await api("GET", "auth.test");
    try {
      const { ok, user, user_id, team, team_id, error } = await res
        .json()
        .then((json: any) => json && json);
      if (ok) {
        return `Configured for user "${user}" (${user_id}) on team "${team}" (${team_id})"`;
      } else {
        return `Failed to configure: ${error}`;
      }
    } catch (e) {
      return `Failed to parse slack response: ${res}`;
    }
  },
  status() {
    if (!state.token) {
      return "Please [configure the Slack token](https://api.slack.com/authentication/token-types#bot)";
    } else {
      return `Ready`;
    }
  },
  channels: () => ({}),
  users: () => ({}),
  parse({ name, value }) {
    switch (name) {
      case "user": {
        const [id] = value.match(/[^"]*$/g);
        return [root.users.one({ id })];
      }
      case "channel": {
        const [id] = value.match(/[^"]*$/g);
        return [root.channels.one({ id })];
      }
      case "message": {
        // Fix the bug where the message is not parsed correctly
        const [id] = value.match(/[^"]*$/g);
        [root.channels.one({ id }).messages.one({ ts: id })];
      }
    }
    return [];
  },
  tests: () => ({}),
};

export const Tests = {
  testGetChannels: async () => {
    const channels = await root.channels.page.items.$query(`{ id }`);
    return Array.isArray(channels);
  },
  testGetUsers: async () => {
    const users = await root.users.page.items.$query(`{ id }`);
    return Array.isArray(users);
  },
};

export const ChannelCollection = {
  one: async ({ id }) => {
    const res = await api("GET", "conversations.info", {
      channel: id,
    });
    const { channel } = await res.json();
    return channel;
  },
  page: async (args, { self }) => {
    const res = await api("GET", "conversations.list", {
      ...args,
    });
    const { channels, response_metadata } = await res.json();
    return {
      items: channels,
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
  create: async ({ name, is_private }) => {
    await api("POST", "conversations.create", null, {
      name,
      is_private,
    });
  },
};

export const UserCollection = {
  one: async ({ id }) => {
    const res = await api("GET", "users.info", {
      user: id,
    });
    const { user } = await res.json();
    return user;
  },
  page: async (args, { self }) => {
    const res = await api("GET", "users.list", {
      ...args,
    });
    const { members, response_metadata } = await res.json();
    return {
      items: members,
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
};

export const MemberCollection = {
  one: async ({ id }) => {
    const res = await api("GET", "users.info", {
      user: id,
    });
    const { user } = await res.json();
    return user;
  },
  page: async (args, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.members", {
      ...args,
      channel: id,
    });
    const { members, response_metadata } = await res.json();
    return {
      items: members.map((id) => ({ id })),
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
};

export const MessageCollection = {
  one: async ({ ts }, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.history", {
      latest: ts,
      limit: 1,
      inclusive: true,
      channel: id,
    });
    const { messages } = await res.json();
    return messages[0];
  },
  page: async (args, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.history", {
      ...args,
      channel: id,
    });
    const { messages } = await res.json();
    const lastMessage = messages[messages.length - 1];
    return {
      items: messages,
      next: self.page({ latest: lastMessage.ts, limit: args.limit }),
    };
  },
};

export const User = {
  gref: (_, { obj }) => {
    return root.users.one({ id: obj.id });
  },
  sendMessage: async (args, { self }) => {
    if (args.channel) {
      await api("POST", "chat.postMessage", null, args);
      return;
    }

    const { id } = self.$argsAt(root.users.one);
    const res = await api("POST", "conversations.open", null, {
      users: id,
    });
    const { channel } = await res.json();
    await api("POST", "chat.postMessage", null, {
      channel: channel.id,
      ...args,
    });
  },
};

export const Channel = {
  gref: (_, { obj }) => {
    return root.channels.one({ id: obj.id });
  },
  members: () => ({}),
  // to read messages, /invite @bot to the channel
  messages: () => ({}),
  invite: async ({ users }, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "conversations.invite", null, {
      channel: id,
      users: users,
    });
  },
  leave: async (_, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "conversations.leave", null, {
      channel: id,
    });
  },
  sendMessage: async (args, { self }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "chat.postMessage", null, {
      channel: id,
      ...args,
    });
  },
};

export const Member = {
  gref: (_, { obj }) => {
    return root.users.one({ id: obj.id });
  },
};

export const Message = {
  gref: (_, { self, obj }) => {
    const { id } = self.$argsAt(root.channels.one);
    return root.channels.one({ id }).messages.one({ ts: obj.ts });
  },
};

export async function endpoint({ path, body }) {
  if (!body || !path) {
    return;
  }
  switch (path) {
    // Setup url for events:
    // https://api.slack.com/apps/<appid>/event-subscriptions
    case "/events": {
      const event = JSON.parse(body);
      switch (event.type) {
        case "url_verification":
          return JSON.stringify({
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ challenge: event.challenge }),
          });
        case "event_callback":
          // Emit event to channel.
          // Pass event as string for now, handle parsing in event handler.
          await root.channels
            .one({ id: event.event.channel })
            .onEvent.$emit({ event: JSON.stringify(event) });
          return JSON.stringify({ status: 200 });
        default:
          console.log("Unknown Event:", event.type);
          return JSON.stringify({ status: 200 });
      }
    }
    // Setup url for slash commands:
    // https://api.slack.com/apps/<appid>/slash-commands
    case "/commands": {
      const { response_url: url, text, channel_id } = parseQS(body);
      await root.channels
        .one({ id: channel_id })
        .onSlashCommand.$emit({ text, url });
      // Return replace_original: "true", in event handler to update the message.
      return "Processing...";
    }
    default:
      console.log("Unknown Endpoint:", path);
  }
  return;
}

// Parse Query String
const parseQS = (qs: string): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(qs).entries());
