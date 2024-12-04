/**
 * Driver for the Discord API.
 */
import { nodes, root, state } from "membrane";
import {
  api,
  createAuthClient,
  verifyHeaders,
  authStatus,
  html,
  indexHtml,
} from "./utils";

export const Root = {
  status: authStatus,
  configure: async ({ clientId, clientSecret, token, publicKey }) => {
    if (token && publicKey) {
      state.token = token;
      state.publicKey = publicKey;
    }
    if (clientId && clientSecret) {
      state.clientId = clientId;
      state.clientSecret = clientSecret;
      await createAuthClient();
    }
    if (!state.token && !state.clientId) {
      throw new Error(
        "Invalid configuration. Provide either token and publicKey, or clientId and clientSecret, or both."
      );
    }

    state.endpointUrl = await nodes.endpoint.$get();

    // Get and save the application id for commands endpoint
    if (state.token) {
      const req = await api("GET", "oauth2/applications/@me", {}, "botToken");
      const application = await req.json();
      state.applicationId = application.id;
    }

    return "Configuration completed successfully.";
  },

  parse({ name, value }, { self }) {
    switch (name) {
      case "guild": {
        const [id] = value.match(/([0-9]{18})/g);
        return [root.guilds.one({ id })];
      }
      case "channel": {
        const url = new URL(value);
        const [, , guildId, channelId] = url.pathname.split("/");
        return [
          root.guilds.one({ id: guildId }).channels.one({ id: channelId }),
        ];
      }
      case "user": {
        const [id] = value.match(/[0-9]+/g);
        return [root.users.one({ id })];
      }
      case "message": {
        const [channelId, messageId] = value.match(/[0-9]+/g);
        return [
          root.guilds.one.channels
            .one({ id: channelId })
            .messages.one({ id: messageId }),
        ];
      }
    }
    return [];
  },
  guilds: () => ({}),
  users: () => ({}),
  me: async () => {
    const res = await api("GET", "users/@me");
    return await res.json();
  },
  followUpWebhook: async ({ application_id, token, message }) => {
    await api(
      "POST",
      `webhooks/${application_id}/${token}`,
      {},
      JSON.stringify(message)
    );
  },
  tests: () => ({}),
};

export const Tests = {
  ping: async () => {
    const res = await root.me.username;
    return typeof res === "string";
  },
  testGetGuilds: async () => {
    const res = await root.guilds.items.$query(`{ id }`);

    return Array.isArray(res);
  },
  testGetUsers: async () => {
    const id = await root.me.id;
    const res = await root.users.one({ id }).$query(`{ id }`);

    return typeof res === "object";
  },
  testGetChannels: async () => {
    const [guild]: any = await root.guilds.items.$query(`{ id }`);

    const res = await root.guilds
      .one({ id: guild.id })
      .channels.items.$query(`{ id }`);

    return Array.isArray(res);
  },
};

export const UserCollection = {
  one: async ({ id }) => {
    const res = await api("GET", `users/${id}`);
    return await res.json();
  },
};

export const CommandCollection = {
  one: async ({ id }, { self }) => {
    const { id: guildId } = self.$argsAt(root.guilds.one);

    // Get the commands
    const res = await api(
      "GET",
      `applications/${state.applicationId}/guilds/${guildId}/commands/${id}`
    );
    return await res.json();
  },

  items: async (_, { self }) => {
    const { id } = self.$argsAt(root.guilds.one);

    // Get the commands
    const res = await api(
      "GET",
      `applications/${state.applicationId}/guilds/${id}/commands`
    );
    return await res.json();
  },
};

export const MemberCollection = {
  one: async ({ id }, { self }) => {
    const { id: guildId } = self.$argsAt(root.guilds.one);
    const res = await api("GET", `guilds/${guildId}/members/${id}`);
    return await res.json();
  },
  page: async (args, { self }) => {
    const { id } = self.$argsAt(root.guilds.one);
    const res = await api("GET", `guilds/${id}/members`, { ...args });

    const items = await res.json();
    // Get the last user id
    const lastId = items[items.length - 1].user.id;
    return { items, next: self.page({ limit: args.limit, after: lastId }) };
  },
};

export const GuildCollection = {
  one: async ({ id }) => {
    const res = await api("GET", `guilds/${id}`);
    return await res.json();
  },

  items: async () => {
    const res = await api("GET", "users/@me/guilds");
    return await res.json();
  },
};

export const ChannelCollection = {
  one: async ({ id }) => {
    const res = await api("GET", `channels/${id}`);
    return await res.json();
  },

  items: async (_, { self }) => {
    const { id } = self.$argsAt(root.guilds.one);
    const res = await api("GET", `guilds/${id}/channels`);
    return await res.json();
  },
};

export const MessageCollection = {
  one: async ({ id }, { self }) => {
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const res = await api("GET", `channels/${channelId}/messages/${id}`);
    return await res.json();
  },

  items: async (args, { self }) => {
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const res = await api("GET", `channels/${channelId}/messages`, { ...args });
    return await res.json();
  },
};

export const Guild = {
  gref(_, { obj }) {
    return root.guilds.one({ id: obj.id });
  },
  channels: () => ({}),
  commands: () => ({}),
  members: () => ({}),
  createCommand: async (args, { self }) => {
    const { id } = self.$argsAt(root.guilds.one);
    const res = await api(
      "POST",
      `applications/${state.applicationId}/guilds/${id}/commands`,
      null,
      JSON.stringify({
        name: args.name,
        description: args.description,
        options: args.options || [],
        type: args.type || 1,
      })
    );
    return await res.json();
  },
};

export const Command = {
  async gref(_, { self, obj }) {
    const { id } = self.$argsAt(root.guilds.one);
    return root.guilds.one({ id }).commands.one({ id: obj.id });
  },
  delete: async (_, { self, obj }) => {
    const { id: guildId } = self.$argsAt(root.guilds.one);
    const { id } = self.$argsAt(root.guilds.one.commands.one);

    const res = await api(
      "DELETE",
      `applications/${state.applicationId}/guilds/${guildId}/commands/${id}`
    );
  },
};

export const Channel = {
  gref(_, { obj, self }) {
    const { id } = self.$argsAt(root.guilds.one);
    return root.guilds.one({ id }).channels.one({ id: obj.id });
  },
  messages: () => ({}),
  sendMessage: async (args, { self }) => {
    const { id } = self.$argsAt(root.guilds.one.channels.one);
    const msg = {
      content: args.content,
      components: JSON.parse(args.components || "[]"),
      embeds: JSON.parse(args.embeds || "[]"),
    };
    if (args.message_reference)
      msg["message_reference"] = args.message_reference;
    if (args.allowed_mentions) msg["allowed_mentions"] = args.allowed_mentions;
    const res = await api(
      "POST",
      `channels/${id}/messages`,
      null,
      JSON.stringify(msg)
    );
    return await res.json();
  },
};

export const Message = {
  gref(_, { obj, self }) {
    const { id: guildId } = self.$argsAt(root.guilds.one);
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    return root.guilds
      .one({ id: guildId })
      .channels.one({ id: channelId })
      .messages.one({ id: obj.id });
  },
  reactionsByEmote: async (args, { self }) => {
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const { id: messageId } = self.$argsAt(
      root.guilds.one.channels.one.messages.one
    );
    const emoteStr = args.emote_str;
    const res = await api(
      "GET",
      `channels/${channelId}/messages/${messageId}/reactions/${emoteStr}`,
      null
    );
    return await res.json();
  },
  postReaction: async (args, { self }) => {
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const { id: messageId } = self.$argsAt(
      root.guilds.one.channels.one.messages.one
    );
    const emoteStr = args.emote_str;
    const res = await api(
      "PUT",
      `channels/${channelId}/messages/${messageId}/reactions/${emoteStr}/@me`,
      null
    );
  },
};

export const User = {
  gref(_, { obj }) {
    return root.users.one({ id: obj.id });
  },
};

export const Member = {
  gref(_, { obj, self }) {
    const { id } = self.$argsAt(root.guilds.one);
    return root.guilds.one({ id }).members.one({ id: obj.user.id });
  },
};

export const Reaction = {
  gref(_, { obj, self }) {
    const { id: guildId } = self.$argsAt(root.guilds.one);
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const { id: messageId } = self.$argsAt(
      root.guilds.one.channels.one.messages.one
    );
    const emojiUri = encodeURIComponent(obj.emoji.name);
    return root.guilds
      .one({ id: guildId })
      .channels.one({ id: channelId })
      .messages.one({ id: messageId })
      .reactionsByEmote({ emote_str: emojiUri });
  },
};

export const Emoji = {
  gref(_, { obj, self }) {
    const { id: guildId } = self.$argsAt(root.guilds.one);
    const { id: channelId } = self.$argsAt(root.guilds.one.channels.one);
    const { id: messageId } = self.$argsAt(
      root.guilds.one.channels.one.messages.one
    );
    return root.guilds
      .one({ id: guildId })
      .channels.one({ id: channelId })
      .messages.one({ id: messageId });
  },
};

export async function endpoint({ path, query, headers, method, body }) {
  const baseUrl = await nodes.process.endpointUrl.$get();

  switch (path) {
    case "/": {
      return html(indexHtml(await nodes.process.endpointUrl.$get(), "auth"));
    }
    case "/auth":
    case "/auth/": {
      if (!state.oauth2Client) {
        return html(
          "OAuth is not configured. Please invoke `:configure` with clientId and clientSecret first"
        );
      }
      try {
        console.log("Attempting to get authorize URI");
        const url = await state.oauth2Client.authorizationCode.getAuthorizeUri({
          redirectUri: `${baseUrl}/callback`,
          scope: ["bot", "applications.commands"],
        });
        console.log("Authorize URI obtained:", url);
        return JSON.stringify({ status: 303, headers: { location: url } });
      } catch (error) {
        console.error("Error in /auth endpoint:", error);
        return html(`An error occurred: ${error.message}`);
      }
    }
    case "/callback": {
      if (!state.oauth2Client) {
        return html(
          "OAuth client not configured. Please invoke `:configure` first."
        );
      }
      try {
        console.log("Attempting to get token from code redirect");
        const fullUrl = `${baseUrl}${path}?${query}`;
        console.log("Full callback URL:", fullUrl);
        state.accessToken =
          await state.oauth2Client.authorizationCode.getTokenFromCodeRedirect(
            fullUrl,
            {
              redirectUri: `${baseUrl}/callback`,
            }
          );
        console.log("Access token obtained");
        if (state.accessToken?.accessToken) {
          // Get and save the application id for commands endpoint if not already set
          if (!state.applicationId) {
            const req = await api(
              "GET",
              "oauth2/applications/@me",
              {},
              "oauth"
            );
            const application = await req.json();
            state.applicationId = application.id;
          }

          return html(
            'Bot has been added to server - <a href="/auth">Add bot to another Discord server</a>'
          );
        }
      } catch (error) {
        console.error("Error getting access token:", error);
      }
      return html(
        "There was an issue acquiring the access token. Check the logs."
      );
    }
    case "/interactions": {
      const event = JSON.parse(body);
      // verify request signature
      const isVerified = verifyHeaders(body, headers);
      if (!isVerified) {
        return JSON.stringify({
          status: 401,
          body: "invalid request signature",
        });
      }
      // type 1: Is a ping event from discord to verify the endpoint
      // type 2: It's received when someone uses a slash command
      // TODO: handle different types of Interaction Types
      const PING = 1;
      const COMMAND = 2;
      switch (event.type) {
        case PING: {
          return JSON.stringify({
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ type: 1 }),
          });
        }
        case COMMAND: {
          const { token, member, data, guild_id, application_id } = event;
          await root.guilds.one({ id: guild_id }).onSlashCommand.$emit({
            options: JSON.stringify(data.options),
            user: member.user.username,
            token,
            application_id,
          });
          return JSON.stringify({
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
            // ACK an interaction and edit a response later, the user sees a loading state.
            body: JSON.stringify({
              type: 5,
            }),
          });
        }
      }
    }
    default:
      console.log("Unknown Endpoint:", path);
      return JSON.stringify({ status: 404, body: "Not found" });
  }
}
