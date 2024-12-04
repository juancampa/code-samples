import { state, nodes, root } from "membrane";

state.messages ??= [];

export async function listenSms() {
  await nodes.sms.received.$subscribe(root.readSms);
  console.log("SMS subscription set up successfully");
}

export async function readSms(_, { event }) {
  const received = event.message;
  console.log(`Received SMS: ${received}`);
  state.messages.push(received);

  try {
    // Use Claude to generate a response
    const prompt = `
    Human: ${received}

    Assistant: Yo, I'm Claude, an AI that's here to vibe with you. What's good?

    Human: Give me a super short, Gen Z style response to this text: "${received}" Keep it under 50 characters if possible, use abbreviations, emojis, and slang. Make it sound like a quick text message. Don't include any prompt text back in your response and don't duplicate responses.

    Assistant:`;

    console.log("Sending prompt to Claude:", prompt);
    const result = await nodes.anthropic.complete({
      prompt: prompt,
      model: "claude-2",
      max_tokens_to_sample: 100,
      stop_sequences: ["\n\nHuman:", "\n\nAssistant:"],
    });

    const response = result.trim();
    console.log(`Generated response: ${response}`);

    // Chunk the response if it's too long
    const chunks = chunkMessage(response);
    for (const chunk of chunks) {
      await sendSms({ msg: chunk });
      console.log(`Sent response chunk: ${chunk}`);
      state.messages.push(chunk);
    }

  } catch (error) {
    console.error("Error processing message:", error);
    console.error("Error stack:", error.stack);
    const errorMessage = "Oops, my bad! 🙈 Try again later?";
    await sendSms({ msg: errorMessage });
    state.messages.push(errorMessage);
  }
}

function chunkMessage(message, maxLength = 160) {
  const chunks = [];
  let currentChunk = "";

  const words = message.split(" ");
  for (const word of words) {
    if ((currentChunk + word).length <= maxLength) {
      currentChunk += (currentChunk ? " " : "") + word;
    } else {
      chunks.push(currentChunk);
      currentChunk = word;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function sendSms({ msg }) {
  await nodes.sms.send({ message: msg });
}

export async function clearMessages() {
  state.messages = [];
  console.log("All messages have been cleared from state.");
  return "Messages cleared successfully.";
}

export async function testReceiveSms(message) {
  await readSms(null, { event: { message } });
}