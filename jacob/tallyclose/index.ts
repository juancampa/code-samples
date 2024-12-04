// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, state, root } from "membrane";

export async function setup() {
  nodes.tally.formSubmitted.$subscribe(root.handle);
}

function extractFirstCodeBlock(text: string): string | null {
  const regex = /```(?:\w+\n)?(.+?)```/s;
  const match = text.match(regex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

export async function handle(event) {
  const forminput = await nodes.one.completeChat({
    messages: [
      {
        role: "user",
        content: `Extract the phone number, name, email from this object. Provide a JSON output in triple backticks (\`\`\`) that looks like \`\`\`{"phone": "+XXXXXXXXXXX", "email": "example@example.com", "name": "Jane Doe"}\`\`\`. In particular, the phone number is formatted with no spaces and includes the country code. If a field is not provided, just omit that field from the response object: ${JSON.stringify(
          event
        )}`,
      },
    ],
  });
  const json = extractFirstCodeBlock(forminput.content)?.replace(
    "```json",
    "```"
  );
  if (!json) {
    return "failed to parse json";
  }
  const processed = JSON.parse(json);
  console.log(processed);
  console.log("here");
  const full_contacts: Array<{
    id: string;
    [key: string]: any;
  }> = [];
  if (processed.phone) {
    const contacts = await nodes.closecrm.contacts
      .findContactPhone({ phone: processed.phone })
      .$query(" { id }");
    const full_contacts_phone = await Promise.all(
      contacts
        .filter((contact) => contact.id !== undefined)
        .map(
          async (contact) =>
            await nodes.closecrm.contacts
              .one({ id: contact.id as string })
              .$query(" { name phones emails id} ")
        )
    );
    full_contacts.push(
      ...full_contacts_phone.filter((entry) => entry.id !== undefined)
    );
  }
  if (processed.email) {
    const contacts = await nodes.closecrm.contacts
      .findContactEmail({ email: processed.email })
      .$query("{ id }");
    const full_contacts_email = await Promise.all(
      contacts
        .filter((contact) => contact.id !== undefined)
        .map(
          async (contact) =>
            await nodes.closecrm.contacts
              .one({ id: contact.id as string })
              .$query(" { name phones emails id } ")
        )
    );
    full_contacts.push(
      ...full_contacts_email.filter((entry) => entry.id !== undefined)
    );
  }
  console.log("full_contacts", full_contacts);
  if (full_contacts.length > 0) {
    const forminput = await nodes.one.completeChat({
      messages: [
        {
          role: "user",
          content: `Extract the phone number, name, email from this object. Provide a JSON output in triple backticks (\`\`\`) that looks like \`\`\`{"phone": "+XXXXXXXXXXX", "email": "example@example.com", "name": "Jane Doe"}\`\`\`. In particular, the phone number is formatted with no spaces and includes the country code. If a field is not provided, just omit that field from the response object: ${JSON.stringify(
            full_contacts
          )}`,
        },
      ],
    });
    const json = extractFirstCodeBlock(forminput.content)?.replace(
      "```json",
      "```"
    );
    const parsedData = JSON.parse(json);
    if (!json) {
      return "failed to parse json";
    }
    const update_info = parsedData.name ? { name: parsedData.name } : {};
    if (parsedData.phone) {
      update_info["phones"] = [{ phone: parsedData.phone }];
    }
    if (parsedData.email) {
      update_info["emails"] = [{ email: parsedData.email }];
    }
    await nodes.closecrm.contacts.updateContact({
      contact_id: full_contacts[0].id,
      ...update_info,
    });
  } else {
    console.log("no existing contact found");
    const new_lead = processed.name ? { name: processed.name } : {};
    if (processed.phone || processed.email) {
      new_lead["contacts"] = [{}];
      if (processed.phone) {
        new_lead["contacts"][0]["phones"] = [{ phone: processed.phone }];
      }
      if (processed.email) {
        new_lead["contacts"][0]["emails"] = [{ email: processed.email }];
      }
    }
    await nodes.closecrm.leads.createLead(new_lead);
  }
}
//include dedupe here?
//send SMS/Slack to Andrew if fails to process?
//is any information available?
//if nothing available:
//phone/email found in DB?
//phone/email not found in DB
//phone/email not available but other info available
// await nodes.closecrm.contacts.findContactEmail();
//display_name is phone number?
//match with name as well?

// Handles the program's HTTP endpoint
export async function endpoint(args) {
  return `Path: ${args.path}`;
}
