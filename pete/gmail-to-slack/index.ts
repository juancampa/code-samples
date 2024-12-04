import { state, nodes } from "membrane";

export interface State { userId: string; }
export const status = () => state.userId ? "Ready" : "[Add user id](:configure)";
export const configure = ({ userId }) => state.userId = userId;

export const email = async ({ from, subject, text }) => {
  const message = `---\n_(${from})_ *${subject}* \`\`\`${text}\`\`\`\n---`
  await nodes.slack.sendMessage({ channel: state.userId, text: message });
}
