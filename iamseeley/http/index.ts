// This program forwards queries and actions to sys_http. It exists for a couple of reasons:
//  - `sys_http` has no persistent log so we can't tell what requests have been made if used directly.
//  - At the moment sys_http has the quirk that it doesn't resolve arbitrary GraphQL queries. It always resolves the
//    full QUERY below. If e.g. only `status` is requested, sys_http returns body and headers as well.
import { root, nodes } from "membrane";
const QUERY = "{ status headers body }";

export const Root = {
  get: (args) => nodes.sys_http.get({ ...args }).$query(QUERY),
  post: (args) => nodes.sys_http.post({ ...args }).$invoke(),
  put: (args) => nodes.sys_http.put({ ...args }).$invoke(),
  patch: (args) => nodes.sys_http.patch({ ...args }).$invoke(),
  delete: (args) => nodes.sys_http.delete({ ...args }).$invoke(),
  authenticated: (args) => ({}),
};

export const Authenticated = {
  createLink: (_, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http.authenticated({ api, authId }).createLink().$invoke();
  },
  hasAuthenticated: (_, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .hasAuthenticated()
      .$get();
  },
  get: (args, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .get({ ...args })
      .$query(QUERY);
  },
  post: (args, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .post({ ...args })
      .$invoke();
  },
  put: (args, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .put({ ...args })
      .$invoke();
  },
  patch: (args, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .patch({ ...args })
      .$invoke();
  },
  delete: (args, { self }) => {
    const { api, authId } = self.$argsAt(root.authenticated);
    return nodes.sys_http
      .authenticated({ api, authId })
      .delete({ ...args })
      .$invoke();
  },
};
