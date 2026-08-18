import type { Attachment, Message } from "../database.js";

export interface SendMessageResponse {
  userMessage: Message & { attachments: Attachment[] };
  assistantMessage: Message;
}

export interface SendMessageAiFailureResponse {
  message: string;
  userMessage: Message & { attachments: Attachment[] };
}
