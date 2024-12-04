/**
 * Minimal example program that emails daily advice using the Membrane `openai` driver, Membrane timers, and the Membrane `email` program.
 */
import { nodes, root } from "membrane";

/**
 * Invoke `configure` to set up a cron timer
 */
export function configure() {
  root.sendAdvice.$cron(`0 0 9 * * *`);
}

export async function sendAdvice() {
  try {
    const result = await nodes.openai.models
      .one({ id: "gpt-3.5-turbo" })
      .completeChat({
        temperature: 1.5,
        messages: [
          {
            role: "system",
            content: "You're a generally wise person with lots of life experience. Provide a piece of random advice for today. Topics could include work, diet, exercise, nutrition, relationships, etc.",
          },
          {
            role: "user",
            content:
              "Give me a short advice for this day, from the best tech leaders.",
          },
        ],
      });

    const { content } = result as any;

    await nodes.email.send({
      subject: "Your advice for today",
      body: `${content}`,
    });
  } catch (error) {
    console.error("Error occurred while generating advice:", error);
  }
}
