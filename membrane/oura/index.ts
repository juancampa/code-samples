/**
 * Driver for Oura.
 *
 * Full coverage of the Oura V2 API is not implemented.
 * See the [Oura V2 API docs](https://cloud.ouraring.com/v2/docs) for more information.
 */

import { root, state } from "membrane";
import { api, paginate } from "./helpers";

export interface State {
  personalAccessToken?: string;
}

export const Root: resolvers.Root = {
  status() {
    return !state.personalAccessToken
      ? "[Add Personal Access Token](:configure)"
      : "Ready";
  },

  // To set up a token: https://cloud.ouraring.com/personal-access-tokens/new
  async configure({ personalAccessToken }) {
    state.personalAccessToken = personalAccessToken;
    root.statusChanged.$emit();
  },

  dailySleep: () => ({}),
  dailyActivity: () => ({}),
  dailyReadiness: () => ({}),
  dailyStress: () => ({}),
};

export const DailySleep: resolvers.DailySleep = {
  gref: (_, { obj }) => root.dailySleep.one({ id: obj.id }),
};

export const DailySleepCollection: resolvers.DailySleepCollection = {
  one: ({ id }) => api(`/daily_sleep/${id}`),
  page: async (args, { self }) => paginate("/daily_sleep", args, self),
};

export const DailyActivity: resolvers.DailyActivity = {
  gref: (_, { obj }) => root.dailyActivity.one({ id: obj.id }),
};

export const DailyActivityCollection: resolvers.DailyActivityCollection = {
  one: ({ id }) => api(`/daily_activity/${id}`),
  page: async (args, { self }) => paginate("/daily_activity", args, self),
};

export const DailyReadiness: resolvers.DailyReadiness = {
  gref: (_, { obj }) => root.dailyReadiness.one({ id: obj.id }),
};

export const DailyReadinessCollection: resolvers.DailyReadinessCollection = {
  one: ({ id }) => api(`/daily_readiness/${id}`),
  page: async (args, { self }) => paginate("/daily_readiness", args, self),
};

export const DailyStress: resolvers.DailyStress = {
  gref: (_, { obj }) => root.dailyStress.one({ id: obj.id }),
};

export const DailyStressCollection: resolvers.DailyStressCollection = {
  one: ({ id }) => api(`/daily_stress/${id}`),
  page: async (args, { self }) => paginate("/daily_stress", args, self),
};
