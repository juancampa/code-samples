/**
 * TODO: test (1) API Keys, (2) Audiences, and (3) Contacts
 */
import { root } from "membrane";

/**
 * See testing email addresses at: https://resend.dev
 * Note: missing tests for update and cancel (manually tested on 10/22/24)
 */
export const emailTests = {
  async testEmailDelivered() {
    const { id } = await root.emails.send({
      from: "onboarding@resend.dev",
      to: ["delivered@resend.dev"],
      subject: "Test delivered email",
      html: "<p>This is a test email that should be delivered.</p>",
    });

    await sleep(2); // wait 2s arbitrarily for the email to deliver

    const { last_event } = await root.emails
      .one({ id: String(id) })
      .$query("{ last_event }");

    if (last_event !== "delivered") {
      throw new Error("Expected email to deliver");
    }
  },
  async testEmailBounced() {
    const { id } = await root.emails.send({
      from: "onboarding@resend.dev",
      to: ["bounced@resend.dev"],
      subject: "Test bounced email",
      html: "<p>This is a test email that should bounce</p>",
    });

    await sleep(2); // wait 2s arbitrarily for the email to bounce

    const { last_event } = await root.emails
      .one({ id: String(id) })
      .$query("{ last_event }");

    if (last_event !== "bounced") throw new Error("Expected email to bounce");
  },
  async testEmailSpam() {
    const { id } = await root.emails.send({
      from: "onboarding@resend.dev",
      to: ["complained@resend.dev"],
      subject: "Test spam email",
      html: "<p>This is a test spam email</p>",
    });

    await sleep(2); // wait 2s arbitrarily for the email to be marked spam

    const { last_event } = await root.emails
      .one({ id: String(id) })
      .$query("{ last_event }");

    if (last_event !== "complained") {
      throw new Error("Expected email to be marked spam");
    }
  },
  async testEmailBatch() {
    const from = "onboarding@resend.dev";
    const to = ["pete@membrane.io"]; // you can only send test batch emails to yourself
    const subject = "Test batch email";
    const text = "Test batch email";
    const emails = await root.emails.batch({
      emails: [
        { from, to, subject, text },
        { from, to, subject, text },
      ],
    });

    await sleep(10); // wait 10s arbitrarily for the emails to deliver

    for (const email of emails as any[]) {
      const { last_event } = await root.emails
        .one({ id: email.id })
        .$query("{ last_event }");

      if (last_event !== "delivered") {
        throw new Error("Expected email to deliver");
      }
    }
  },
};

/**
 * Note: 1 domain supported on free plan
 */
export const domainTests = {
  async testDomainList() {
    const domains = await root.domains.page().items.$query("{ name }");
    if (!domains.some((d) => d.name === "membrane.io")) {
      throw new Error("Expected membrane.io in list of domains");
    }
  },
  async testDomainCreate() {
    await root.domains.create({ name: "membrane.io" });
    await domainTests.testDomainList();
  },
  async testDomainUpdate() {
    let domains = await root.domains.page().items.$query("{ id name }");
    const domain = domains.find((d) => d.name === "membrane.io");
    if (!domain?.id) throw new Error("No domain to update");
    try {
      await root.domains.one({ id: domain.id }).update({ open_tracking: true });
    } catch (error) {
      throw new Error("Failed to update domain");
    }
  },
  async testDomainVerify() {
    let domains = await root.domains.page().items.$query("{ id name }");
    const domain = domains.find((d) => d.name === "membrane.io");
    if (!domain?.id) throw new Error("No domain to verify");
    try {
      await root.domains.one({ id: domain.id }).verify();
    } catch (error) {
      throw new Error("Failed to verify domain");
    }
  },
  async testDomainDelete() {
    let domains = await root.domains.page().items.$query("{ id name }");
    const domain = domains.find((d) => d.name === "membrane.io");
    if (!domain?.id) throw new Error("No domain to delete");
    await root.domains.one({ id: domain.id }).delete();

    domains = await root.domains.page().items.$query("{ id name }");
    if (domains.some((d) => d.name === "membrane.io")) {
      throw new Error("Expected membrane.io to be deleted");
    }
  },
};
