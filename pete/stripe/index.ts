/**
 * Driver for the Stripe API.
 */
import { state, root, resolvers } from "membrane";
import { api, paginate } from "./helpers";

export { TestCollection } from "./tests";

export interface State {
  secretKey?: string;
}

export const Root: resolvers.Root = {
  /**
   * https://docs.stripe.com/keys
   * https://dashboard.stripe.com/apikeys
   */
  async configure({ secretKey }) {
    state.secretKey = secretKey;
    root.statusChanged.$emit();
  },

  /**
   *
   * `secretKey` is required to access the Stripe API.
   */
  status() {
    if (!state.secretKey) return "[Add secret key](:configure)";

    const isTestKey = state.secretKey?.startsWith("sk_test");
    const isLiveKey = state.secretKey?.startsWith("sk_live");
    if (isTestKey) return `Ready (TEST mode)`;
    if (isLiveKey) return `Ready (LIVE mode)`;

    return "[Unexpected secret key format](:configure)";
  },

  tests: () => ({}),

  /**
   * Resolver to get, create, update, and cancel refunds.
   * https://docs.stripe.com/api/refunds
   */
  refunds: () => ({}),
};

export const Refund: resolvers.Refund = {
  gref: (_, { obj }) => root.refunds.one({ id: obj.id }),
};

export const RefundsCollection: resolvers.RefundsCollection = {
  one: ({ id }) => api({ method: "GET", path: `/refunds/${id}`, body: {} }),
  page: (args, { self }) => paginate("/refunds", args, self),

  create: ({ payment_intent, amount }) =>
    api({ method: "POST", path: "/refunds", body: { payment_intent, amount } }),

  // Updates the refund with arbitrary metadata not used by Stripe.
  update: ({ id, metadata }) =>
    api({ method: "POST", path: `/refunds/${id}`, body: { metadata } }),

  // Cancels a refund with a status of `requires_action`.
  // Only refunds for payment methods that require customer action can enter the `requires_action` state.
  cancel: ({ id }) =>
    api({ method: "POST", path: `/refunds/${id}/cancel`, body: {} }),
};
