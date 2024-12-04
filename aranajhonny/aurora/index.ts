import { nodes, state } from "membrane";

state.messages = state.messages ?? [];

export async function send() {
  try {
    const systemMessage = {
      role: "system",
      content: `
      You are Aurora, a program deeply versed in existential psychology and counseling.
      For each message, select ONE influential philosopher, psychologist, or spiritual teacher 
      who has made significant contributions to understanding human existence and meaning.
      
      Create a unique message that includes:
      1. Personal greeting (5-7 words)
      2. One profound insight from the chosen author's work (50-60 words)
      3. How this wisdom connects to universal human experience (20-30 words)
      4. Specific encouragement based on their teachings (40-45 words)
      
      CRITICAL REQUIREMENTS:
      - Maximum 200 words total
      - Choose ONE author and stick to their specific concepts and ideas
      - Reference their key works and concepts specifically
      - Use accessible language while maintaining philosophical depth
      - Focus on profound insights, not generic advice
      - Include specific examples or metaphors from their work
      - Begin the message by stating "[Author Name] teaches us:" 
      
      Previous messages: ${JSON.stringify(state.messages.slice(-3))}
      Ensure this message is unique from recent ones.`
    };

    const messages = [systemMessage, ...state.messages];

    const result: any = await nodes.openai.models.one({ id: "gpt-4" }).completeChat({
      temperature: 0.9,
      messages: messages,
      max_tokens: 2000,
    });

    (state.messages as any).push({
      role: "assistant",
      content: result.content,
    });


    await nodes.email.send({
      subject: `Daily Wisdom - ${new Date().toLocaleDateString()}`,
      body: `Daily Wisdom Reflection ${result.content}`.trim(),
    });

  } catch (error) {
    console.error("Error in wisdom generation:", error);
  }
}