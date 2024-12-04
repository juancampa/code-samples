import { nodes, root, state } from "membrane";

export interface State {
  config: {
    stripeWebhookSecret: string;
    grafbaseApiUrl: string;
    internalSecret: string;
    monthPriceId: string;
    yearPriceId: string;
    baselimeApiKey: string;
  };
}

// Initialize state
state.config ??= {
  stripeWebhookSecret: "",
  grafbaseApiUrl: "",
  internalSecret: "",
  monthPriceId: "",
  yearPriceId: "",
  baselimeApiKey: ""
};

export const Root = {
  async status() {
    const stripeStatus = await nodes.stripe.status().$get();
    if (stripeStatus.includes("Add secret key")) {
      return "Configure Stripe driver first";
    }
    if (!state.config.stripeWebhookSecret) {
      return "Configure Stripe webhook secret";
    }
    if (!state.config.grafbaseApiUrl) {
      return "Configure Grafbase API URL";
    }
    if (!state.config.internalSecret) {
      return "Configure internal secret";
    }
    if (!state.config.monthPriceId || !state.config.yearPriceId) {
      return "Configure price IDs";
    }
    if (!state.config.baselimeApiKey) {
      return "Configure Baselime API key";
    }
    return "Ready";
  },

  configure: async ({ 
    stripeWebhookSecret,
    grafbaseApiUrl,
    internalSecret,
    monthPriceId,
    yearPriceId,
    baselimeApiKey
  }) => {
    if (stripeWebhookSecret) state.config.stripeWebhookSecret = stripeWebhookSecret;
    if (grafbaseApiUrl) state.config.grafbaseApiUrl = grafbaseApiUrl;
    if (internalSecret) state.config.internalSecret = internalSecret;
    if (monthPriceId) state.config.monthPriceId = monthPriceId;
    if (yearPriceId) state.config.yearPriceId = yearPriceId;
    if (baselimeApiKey) state.config.baselimeApiKey = baselimeApiKey;
    
    root.statusChanged.$emit();
  },

  async logError({ error, additionalMessage }: { error: any; additionalMessage?: string | Record<string, any> }) {
    if (typeof error === "object") {
      error = Object.assign(
        {
          message: error.message,
          stack: error.stack,
        },
        error
      );
    }

    await fetch("https://events.baselime.io/v1/stripe/events/errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": state.config.baselimeApiKey
      },
      body: JSON.stringify([{ error, additionalMessage }])
    });
  },

  async log({ message, additionalMessage }: { message: any; additionalMessage?: string | Record<string, any> }) {
    await fetch("https://events.baselime.io/v1/stripe/events/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": state.config.baselimeApiKey
      },
      body: JSON.stringify([{ message, additionalMessage }])
    });
  },

  endpoint: async ({ method, path, body, headers }) => {
    if (method !== "POST" || path !== "/webhook") {
      return JSON.stringify({ error: "Not found" });
    }

    try {
      const signature = headers["stripe-signature"];
      
      if (!signature) {
        await root.logError({
          error: { message: "No Stripe signature found" },
          additionalMessage: "Webhook signature verification failed"
        });
        return JSON.stringify({ err: "failed" });
      }

      // TODO: Once Membrane supports raw body access for proper signature verification
      // event = await stripe.webhooks.constructEventAsync(rawBody, signature, endpointSecret)
      const event = JSON.parse(body);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          
          if (session.status === "complete") {
            try {
              // Get subscription details
              const subscription = await nodes.stripe.subscriptions.one({ 
                id: session.subscription 
              });

              const email = session.metadata.userEmail.trim();
              const endDateInUnix = subscription.current_period_end;
              const priceId = subscription.items.data[0].price.id;
              const stripePlan = priceId === state.config.monthPriceId ? "month" : "year";

              // Update user membership via Grafbase
              await fetch(state.config.grafbaseApiUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${state.config.internalSecret}`
                },
                body: JSON.stringify({
                  query: `
                    mutation InternalUpdateMemberUntilOfUser(
                      $email: String!, 
                      $memberUntilDateInUnixTime: Int!,
                      $stripeSubscriptionObjectId: String!,
                      $stripePlan: String!
                    ) {
                      internalUpdateMemberUntilOfUser(
                        email: $email,
                        memberUntilDateInUnixTime: $memberUntilDateInUnixTime,
                        stripeSubscriptionObjectId: $stripeSubscriptionObjectId,
                        stripePlan: $stripePlan
                      )
                    }
                  `,
                  variables: {
                    email,
                    memberUntilDateInUnixTime: endDateInUnix,
                    stripeSubscriptionObjectId: subscription.id,
                    stripePlan
                  }
                })
              });

              return JSON.stringify({ success: "memberUntil value is updated" });

            } catch (error) {
              await root.logError({
                error: { message: error.message, stack: error.stack },
                additionalMessage: "Failed to process checkout session"
              });
              throw error;
            }
          }
          break;
        }

        default:
          await root.logError({
            error: { message: `Unhandled event type: ${event.type}`, event },
            additionalMessage: "Unhandled event type"
          });
          return JSON.stringify({ error: "Unhandled event type" });
      }

      return JSON.stringify({});

    } catch (err) {
      await root.logError({
        error: { message: err.message, stack: err.stack },
        additionalMessage: "error in webhook handler"
      });
      return JSON.stringify({ 
        error: "Internal Server Error"
      });
    }
  }
};