import { root } from "membrane";
import { status, configure, api } from "./helpers";
import { emailTests, domainTests } from "./tests";

export const Root = {
  status,
  configure,
  emails: () => EmailCollection,
  domains: () => DomainCollection,
  apiKeys: () => ApiKeyCollection,
  audiences: () => AudienceCollection,
  contacts: () => ContactCollection,
  tests: () => Tests,
};

export const EmailCollection = {
  async one({ id }: { id: string }) {
    const data = await api("GET", `emails/${id}`);
    return { ...data, ...Email };
  },
  async send(args: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    cc?: string;
    bcc?: string;
    reply_to?: string;
    scheduled_at?: string;
  }) {
    const data = await api("POST", "emails", undefined, args);
    return { ...data, ...Email };
  },
  /**
   * We don't support ListOf<T> types for action params yet,
   * so we're typing `emails` as Json for now.
   */
  async batch(args: { emails: string }) {
    const data = await api("POST", "emails/batch", undefined, args.emails);
    return data.data.map((item: any) => ({ ...item, ...Email }));
  },
};

export const Email = {
  gref: function (_, { obj }) {
    return root.emails.one({ id: obj.id });
  },
  async update(args: { scheduled_at: string }, { self }) {
    const { id } = self.$argsAt(root.emails.one);
    return api("PATCH", `emails/${id}`, undefined, args);
  },
  async cancel(_, { self }) {
    const { id } = self.$argsAt(root.emails.one);
    return api("POST", `emails/${id}/cancel`);
  },
};

export const DomainCollection = {
  async one({ id }: { id: string }) {
    const data = await api("GET", `domains/${id}`);
    return { ...data, ...Domain };
  },
  async page() {
    const data = await api("GET", "domains");
    return {
      items: data.data.map((item: any) => ({ ...item, ...Domain })),
    };
  },
  async create(args: { name: string; region?: string }) {
    const data = await api("POST", "domains", undefined, args);
    return { ...data, ...Domain };
  },
};

export const Domain = {
  gref: function (_, { obj }) {
    return root.domains.one({ id: obj.id });
  },
  async update(
    args: { open_tracking?: boolean; click_tracking?: boolean; tls?: string },
    { self }
  ) {
    const { id } = self.$argsAt(root.domains.one);
    return api("PATCH", `domains/${id}`, undefined, args);
  },
  async delete(_, { self }) {
    const { id } = self.$argsAt(root.domains.one);
    return api("DELETE", `domains/${id}`);
  },
  async verify(_, { self }) {
    const { id } = self.$argsAt(root.domains.one);
    return api("POST", `domains/${id}/verify`);
  },
};

export const ApiKeyCollection = {
  one: ({ id, name, created_at }) => ({ id, name, created_at }),
  async page() {
    const data = await api("GET", "api-keys");
    return {
      items: data.data.map((item: any) => ({ ...item })),
    };
  },
  async create(args: { name: string; permission: string; domain_id?: string }) {
    const data = await api("POST", "api-keys", undefined, args);
    return { ...data };
  },
  async delete(args: { id: string }) {
    return api("DELETE", `api-keys/${args.id}`);
  },
};

export const ApiKey = {
  gref: (_, { obj }) => root.apiKeys.one(obj),
};

export const AudienceCollection = {
  async one({ id }: { id: string }) {
    const data = await api("GET", `audiences/${id}`);
    return { ...data, ...Audience };
  },
  async page() {
    const data = await api("GET", "audiences");
    return {
      items: data.data.map((item: any) => ({ ...item, ...Audience })),
    };
  },
  async create(args: { name: string }) {
    const data = await api("POST", "audiences", undefined, args);
    return { ...data, ...Audience };
  },
};

export const Audience = {
  gref: function (_, { obj }) {
    return root.audiences.one({ id: obj.id });
  },
  async delete(_, { self }) {
    const { id } = self.$argsAt(root.audiences.one);
    return api("DELETE", `audiences/${id}`);
  },
  contacts: () => ContactCollection,
};

export const ContactCollection = {
  async one({ id }: { id: string }, { self }) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    const data = await api("GET", `audiences/${audienceId}/contacts/${id}`);
    return { ...data, ...Contact };
  },
  async page(_, { self }) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    const data = await api("GET", `audiences/${audienceId}/contacts`);
    return {
      items: data.data.map((item: any) => ({ ...item, ...Contact })),
    };
  },
  async create(
    args: {
      email: string;
      first_name?: string;
      last_name?: string;
      unsubscribed?: boolean;
    },
    { self }
  ) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    const data = await api(
      "POST",
      `audiences/${audienceId}/contacts`,
      undefined,
      args
    );
    return { ...data, ...Contact };
  },
};

export const Contact = {
  gref: function (_, { obj, self }) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    return root.audiences.one({ id: audienceId }).contacts.one({ id: obj.id });
  },
  async update(
    args: {
      email?: string;
      first_name?: string;
      last_name?: string;
      unsubscribed?: boolean;
    },
    { self }
  ) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    const { id } = self.$argsAt(root.audiences.one.contacts.one);
    return api(
      "PATCH",
      `audiences/${audienceId}/contacts/${id}`,
      undefined,
      args
    );
  },
  async delete(_, { self }) {
    const { id: audienceId } = self.$argsAt(root.audiences.one);
    const { id } = self.$argsAt(root.audiences.one.contacts.one);
    return api("DELETE", `audiences/${audienceId}/contacts/${id}`);
  },
};

export const Tests = {
  ...emailTests,
  ...domainTests,
};
