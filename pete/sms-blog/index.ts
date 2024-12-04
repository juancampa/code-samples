/**
 * 1. Receive sms.
 * 2. Save in `state`.
 * 3. Serve blog from HTTP endpoint.
 */
import { state } from "membrane";
import { format } from 'date-fns';

state.messages ??= [];
export interface State {
  messages: TextMessage[];
}

interface TextMessage {
  text: string;
  timestamp: number;
}

/**
 * Handle `sms.received` events.
 */
export async function saveSms(_, { event }) {
  if (!(event.message as string).startsWith("Blog:")) return;

  const text = event.message.replace("Blog: ", "");
  const timestamp = Date.now();
  state.messages.push({ text, timestamp });
}

/**
 * Serve HTML blog.
 */
export async function endpoint(_req) {
  const days = groupPostsByDay(state.messages).map(({ day, posts }) => {
    const entries = posts.map(({ text, timestamp }) => {
      const formatted = formatTimestamp(timestamp);
      const time = formatted.slice(18);

      return `
        <h3>${time}</h3>
        <p>${text}</p>
      `
    })

    return `
      <section>
        <h2>${day}</h2>
        ${entries.slice().join('')}
      </section>
    `
  });

  return `
    <main style="font-family: monospace;">
      <h1>sms blogger</h1>
      <p>When I send a text to Membrane, it shows up below.</p>
      ${days.slice().join('')}
    </main>
  `;
}

function groupPostsByDay(messages: TextMessage[]) {
  const grouped: Array<{ day: string; posts: TextMessage[] }> = [];

  messages.forEach(({ text, timestamp }) => {
    const formatted = formatTimestamp(timestamp);
    const day = formatted.slice(0, 16);

    if (grouped[0]?.day.startsWith(day)) {
      grouped[0].posts.unshift({ text, timestamp });
    } else {
      grouped.unshift({
        day,
        posts: [{ text, timestamp }],
      })
    }
  })

  return grouped;
}

const formatTimestamp = (ts) => format(new Date(ts), "EEE, MMM dd yyyy, h:mm:ss a");
