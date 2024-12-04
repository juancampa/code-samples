import { state, nodes, root, resolvers } from "membrane";

export interface State {
  newsletters: Record<string, string>; // email -> name
  receivedEmails: Array<{
    from: string;
    subject: string;
    content: string;
    receivedAt: number;
  }>;
  blockedEmails: Set<string>;
  lastRoundupTime: number;
}

state.newsletters ??= [];
state.receivedEmails ??= [];
state.blockedEmails ??= new Set();
state.lastRoundupTime ??= 0;

export async function blockNewsletter(email: string) {
  if (!state.blockedEmails.has(email)) {
    state.blockedEmails.push(email);
    // Remove from newsletters if present
    delete state.newsletters[email];
    console.log(`Blocked newsletter from: ${email}`);
    return `Newsletter from ${email} blocked successfully`;
  }
  return `Newsletter from ${email} is already blocked`;
}

export async function unblockNewsletter(email: string) {
  if (state.blockedEmails.has(email)) {
    state.blockedEmails.delete(email);
    console.log(`Unblocked newsletter from: ${email}`);
    return `Newsletter from ${email} unblocked successfully`;
  }
  return `Newsletter from ${email} is not blocked`;
}

export function listBlockedNewsletters() {
  return Array.from(state.blockedEmails);
}

export async function addNewsletter(name: string, email: string) {
  if (!state.newsletters.some(newsletter => newsletter.email === email)) {
    state.newsletters.push({ name, email });
    console.log(`Added newsletter: ${name} (${email})`);
    return `Newsletter ${name} added successfully`;
  }
  return `Newsletter with email ${email} already exists`;
}

export async function deleteNewsletter(email: string) {
  if (email in state.newsletters) {
    const name = state.newsletters[email];
    delete state.newsletters[email];

    console.log(`Deleted newsletter: ${name} (${email})`);

    return `Newsletter ${name} deleted successfully`;
  }

  return `Newsletter with email ${email} not found`;
}

export function listNewsletters() {
  return Object.entries(state.newsletters).map(([email, name]) => ({ name, email }))
}

export const email: resolvers.Root["email"] = async (args) => {
  const { from, subject, text, html } = args;
  
  if (!from) {
    console.log("Received email with undefined 'from' field");
    return;
  }

  if (state.blockedEmails.has(from)) {
    console.log(`Blocked email from: ${from}`);
    return;
  }

  // Automatically add as a newsletter if not already present
  if (!(from in state.newsletters)) {
    state.newsletters[from] = from; // Using email as name for simplicity
    console.log(`Added new newsletter: ${from}`);
  }

  state.receivedEmails.push({
    from,
    subject: subject || "(No subject)",
    content: html || text || "",
    receivedAt: Date.now()
  });

  console.log(`Received email from: ${from}, Subject: ${subject || "(No subject)"}`);
};

function stripHtml(html: string): string {
  let text = html.replace(/<[^>]*>/g, '');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

export async function generateRoundup() {
  console.log("Starting generateRoundup function");
  
  const currentTime = Date.now();
  console.log(`Last roundup time: ${new Date(state.lastRoundupTime).toLocaleString()}`);
  console.log(`Current time: ${new Date(currentTime).toLocaleString()}`);
  
  console.log(`Total emails in state: ${state.receivedEmails.length}`);
  
  const recentEmails = state.receivedEmails.filter(email => email.receivedAt > state.lastRoundupTime);
  console.log(`Recent emails found: ${recentEmails.length}`);

  let roundupContent = `Your Newsletter Roundup\n\n`;

  if (recentEmails.length === 0) {
    roundupContent += `No new newsletters received since the last roundup.\n`;
  } else {
    roundupContent += `Here's a summary of the newsletters you received since the last roundup:\n\n`;

    for (const email of recentEmails) {
      const strippedContent = stripHtml(email.content);
      const truncatedContent = strippedContent.length > 200 
        ? strippedContent.substring(0, 200) + "..." 
        : strippedContent;
      
      roundupContent += `
      ${email.subject}
      From: ${email.from}
      Received: ${new Date(email.receivedAt).toLocaleString()}

      ${truncatedContent}

      ${'-'.repeat(60)}

      `;
    }
  }

  await nodes.email.send({
    subject: "Your Newsletter Roundup",
    body: roundupContent,
  });

  state.lastRoundupTime = currentTime;
  console.log("Roundup email sent successfully");
  return "Roundup email sent successfully";
}

export async function configure() {
  // Change the schedule here or by clicking the timer icon on the generateRoundup action in the Membrane Navigator
  root.generateRoundup.$cron("0 0 9 * * 1"); // Every Monday at 9:00 AM
  console.log("Weekly roundup cron job configured");
}