import { resolvers, root } from "membrane";
import { api } from "./helpers";

export const TestCollection: resolvers.TestCollection = {
  /**
   * Refunds a test payment intent.
   * https://docs.stripe.com/api/refunds/create
   * https://docs.stripe.com/testing?testing-method=payment-methods#refunds
   */
  testRefunds: async () => {
    const created = await root.refunds
      .create({
        // This is a test payment intent of amount 10000 (100.00 USD)
        payment_intent: "pi_3POhP52NeGIKExSH0MEGjPBj",
        amount: 1, // Refund 1 cent
      })
      .$query("id");

    if (!created.id) throw new Error("Refund not created");
    console.log(
      `Test create refund success. Id: ${JSON.stringify(created.id)}`
    );

    const updated = await root.refunds
      .update({
        id: created.id,
        metadata: { note: "customer left a 5 star review" },
      })
      .$query("id");

    if (!updated.id) throw new Error("Refund not updated");
    console.log(
      `Test update refund success. Id: ${JSON.stringify(updated.id)}`
    );

    const one = await root.refunds.one({ id: created.id }).$query("id");
    if (!one.id) throw new Error("Refund not found");
    console.log(`Test one refund success. Id: ${JSON.stringify(one.id)}`);

    const page = await root.refunds.page().$query("{ items { id } }");
    if (!page?.items) throw new Error("Refunds not found");
    console.log(
      `Test page refunds success. Total items: ${JSON.stringify(
        page.items.length
      )}`
    );
  },

  /**
   * Creates a test payment intent.
   * https://docs.stripe.com/api/payment_intents/create
   * https://docs.stripe.com/testing?testing-method=payment-methods#cards
   */
  testPaymentIntent: async () => {
    const method = "POST";
    const path = "/payment_intents";
    const body = {
      amount: "10000",
      currency: "usd",
      payment_method: "pm_card_visa",
      confirm: "true",
      automatic_payment_methods: {
        enabled: "true",
        allow_redirects: "never",
      },
    };

    const paymentIntent = await api({ method, path, body });
    console.log(
      `Test payment intent success. Id: ${JSON.stringify(paymentIntent.id)}`
    );
  },

  /**
   * Gets your test account balance.
   * https://docs.stripe.com/api/balance
   */
  testBalance: async () => {
    const method = "GET";
    const path = "/balance";

    const balance = await api({ method, path, body: {} });
    console.log(
      `Test balance success. Available: ${JSON.stringify(balance.available)}`
    );
  },

  /**
   * Gets your test account balance transactions.
   * https://docs.stripe.com/api/balance_transactions
   */
  testBalanceTransactions: async () => {
    const method = "GET";
    const path = "/balance_transactions";

    const balanceTransactions = await api({ method, path, body: {} });
    console.log(
      `Test balance transactions success. Total transactions: ${JSON.stringify(
        balanceTransactions.data.length
      )}`
    );
  },

  /**
   * Gets your test charges.
   * https://docs.stripe.com/api/charges
   */
  async testCharges() {
    const method = "GET";
    const path = "/charges";

    const charges = await api({ method, path, body: {} });
    console.log(
      `Test charges success. Total charges: ${JSON.stringify(
        charges.data.length
      )}`
    );
  },

  /**
   * Gets your test customers.
   * https://docs.stripe.com/api/customers
   */
  testCustomers: async () => {
    const method = "GET";
    const path = "/customers";

    const customers = await api({ method, path, body: {} });
    console.log(
      `Test customers success. Total customers: ${JSON.stringify(
        customers.data.length
      )}`
    );
  },
};
