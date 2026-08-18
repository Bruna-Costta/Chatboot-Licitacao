import type { Attachment, Conversation, Message, Triage } from "../database.js";

export interface ConversationResponse extends Conversation {
  triage: Triage;
  messages: Array<Message & { attachments: Attachment[] }>;
}
