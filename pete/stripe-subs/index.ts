import { state, nodes } from "membrane";

// import Stripe from "stripe";
// const stripe = new Stripe(state.STRIPE_API_KEY);

interface StripeEvent {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      current_period_end: number;
      items: {
        data: Array<{
          price: {
            id: string;
          };
        }>;
      };
    };
  };
}

export async function endpoint({ method, path, body, headers, query }) {
  // TODO: verify signature
  // const sig = headers["Stripe-Signature"];
  // const event = await stripe.webhooks.constructEventAsync(body, sig, state.STRIPE_WEBHOOK_SECRET);

  const event: StripeEvent = JSON.parse(body);

  switch (event.type) {
    case "customer.subscription.created":
      const customerSubscriptionCreated = event.data.object;
      // TODO: customer.subscription.created
      break;
    case "customer.subscription.updated":
      const customerSubscriptionUpdated = event.data.object;

      const customer = await getCustomer(customerSubscriptionUpdated.customer);
      const email = customer.email;
      const endDateInUnix = customerSubscriptionUpdated.current_period_end;
      const priceID = customerSubscriptionUpdated.items.data[0].price.id;

      const query = `
        mutation InternalUpdateMemberUntilOfUser($email: String!, $memberUntilDateInUnixTime: Int!, $stripeSubscriptionObjectId: String!, $stripePlan: String!) {
          internalUpdateMemberUntilOfUser(email: $email, memberUntilDateInUnixTime: $memberUntilDateInUnixTime, stripeSubscriptionObjectId: $stripeSubscriptionObjectId, stripePlan: $stripePlan)
        }
      `;

      const variables = {
        email: email,
        memberUntilDateInUnixTime: endDateInUnix,
        stripeSubscriptionObjectId: customerSubscriptionUpdated.id,
        stripePlan:
          priceID === state.SUBSCRIPTION_MONTH_PRICE_ID ? "month" : "year",
      };

      // await db(query, variables);
      console.log(`customer.subscription.updated: ${customer.email}`);

      break;
    case "customer.subscription.deleted":
      const customerSubscriptionDeleted = event.data.object;
      // TODO: customer.subscription.deleted
      break;
    case "customer.subscription.paused":
      const customerSubscriptionPaused = event.data.object;
      // TODO: customer.subscription.paused
      break;
    case "customer.subscription.resumed":
      const customerSubscriptionResumed = event.data.object;
      // TODO: customer.subscription.resumed
      break;
    case "checkout.session.completed":
      const checkoutSessionCompleted = event.data.object;
      // TODO: checkout.session.completed
      break;
    default:
      const message = `Unhandled event type: ${event.type}`;

      await log(message);
      await nodes.email.send({
        subject: "Unhandled Stripe webhook",
        body: message,
      });
  }
}

async function getCustomer(id) {
  const response = await fetch(`https://api.stripe.com/v1/customers/${id}`, {
    headers: {
      Authorization: `Bearer ${state.STRIPE_API_KEY}`,
    },
  });

  const customer = await response.json();
  return customer;
}

async function db(query, variables) {
  const GRAFBASE_API_URL = "";

  return fetch(GRAFBASE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.GRAFBASE_API_SECRET}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
}

async function log(message: string) {
  const BASELIME_API_URL_PROD =
    "https://events.baselime.io/v1/stripe/events/logs";
  const BASELIME_API_URL_STAGING =
    "https://events.baselime.io/v1/staging-stripe/events/logs";

  return fetch(BASELIME_API_URL_PROD, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": state.BASELIME_API_KEY,
    },
    body: JSON.stringify([{ message }]),
  });
}

export interface State {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  GRAFBASE_API_SECRET: string;
  BASELIME_API_KEY: string;
  SUBSCRIPTION_MONTH_PRICE_ID: string;
}

export function configure({
  stripeApiKey,
  stripeWebhookSecret,
  subscriptionMonthPriceId,
  grafbaseApiSecret,
  baselimeApiKey,
}) {
  if (stripeApiKey) {
    state.STRIPE_API_KEY = stripeApiKey;
  }
  if (stripeWebhookSecret) {
    state.STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;
  }
  if (subscriptionMonthPriceId) {
    state.SUBSCRIPTION_MONTH_PRICE_ID = subscriptionMonthPriceId;
  }
  if (grafbaseApiSecret) {
    state.GRAFBASE_API_SECRET = grafbaseApiSecret;
  }
  if (baselimeApiKey) {
    state.BASELIME_API_KEY = baselimeApiKey;
  }
}
