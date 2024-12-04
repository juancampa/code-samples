import { nodes } from "membrane";

export interface State { userId: string; }
export const status = () => state.userId ? "Ready" : "[Add user id](:configure)";
export const configure = ({ userId }) => state.userId = userId;

export async function email({ from, subject, text }) {
  const message = `---\n_(Sentry ALERT)_ *${subject}* \`\`\`${text}\`\`\`\n---`;
  await nodes.slack.sendMessage({ channel: state.userId, text: message });
}
