/**
 * Minimal example program that emails you when a table in Airtable is modified.
 */
import { nodes, root } from "membrane";

export async function configure() {
  await nodes.table.changed.$subscribe(root.tableChanged);
}

export async function tableChanged(_, { event }) {
  const { fields } = await event.record.$query(`{ fields }`);

  let emailBody = ["Table has been changed. Details:\n"];
  for (const fieldName in fields) {
    emailBody.push(`${fieldName}: ${fields[fieldName]}`);
  }

  const { name: table } = await nodes.table.$query("{ name }");
  const subject = `Airtable ${table} has been changed`;
  const body = emailBody.join("\n");

  await nodes.email.send({ subject, body });
}
