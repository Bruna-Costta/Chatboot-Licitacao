import { prisma } from "@workspace/database";
import { DEFAULT_SYSTEM_PROMPT, type AIProvider, type ChatInput, type ChatMessage, type TriageContext } from "@workspace/ai";
import { ATTACHMENT_ALLOWED_MIME_TYPES } from "@workspace/types";

import { aiProvider } from "../../../infrastructure/ai-provider.js";
import { matchesDeclaredMimeType } from "../../../infrastructure/storage/file-signature.js";
import { storageService } from "../../../infrastructure/storage/local-disk-storage.service.js";
import {
  AIProviderError,
  ConversationNotActiveError,
  ConversationNotFoundError,
  EmptyMessageError,
  InvalidFileContentError,
} from "../domain/conversation.errors.js";

export class SendMessageUseCase {
  static async execute(
    conversationId: string,
    userId: string,
    organizationId: string,
    content: string,
    files: File[],
    provider: AIProvider = aiProvider,
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId, organizationId },
      include: { triage: true, messages: { orderBy: { createdAt: "asc" }, include: { attachments: true } } },
    });

    if (!conversation) {
      throw new ConversationNotFoundError();
    }

    if (conversation.status !== "ACTIVE") {
      throw new ConversationNotActiveError();
    }

    const trimmedContent = content.trim();
    if (!trimmedContent && files.length === 0) {
      throw new EmptyMessageError();
    }

    const savedAttachments: { fileName: string; storedName: string; mimeType: string; sizeBytes: number }[] = [];
    for (const file of files) {
      if (!(ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new InvalidFileContentError(file.name);
      }

      const buffer = await file.arrayBuffer();

      if (!matchesDeclaredMimeType(buffer, file.type)) {
        throw new InvalidFileContentError(file.name);
      }

      const stored = await storageService.save(organizationId, file.type, buffer);
      savedAttachments.push({
        fileName: file.name,
        storedName: stored.storedName,
        mimeType: file.type,
        sizeBytes: stored.sizeBytes,
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        organizationId,
        role: "USER",
        content: trimmedContent,
        attachments: { create: savedAttachments.map((attachment) => ({ organizationId, ...attachment })) },
      },
      include: { attachments: true },
    });

    const history: ChatMessage[] = conversation.messages.map((message) => ({
      role: message.role.toLowerCase() as ChatMessage["role"],
      content: message.content,
    }));

    const triageContext: TriageContext = {
      subject: conversation.triage.subject,
      processStage: conversation.triage.processStage,
      contractType: conversation.triage.contractType,
      doubtType: conversation.triage.doubtType,
      // Non-null: a Conversation only exists once CompleteTriageUseCase has already computed this.
      semanticDimension: conversation.triage.semanticDimension!,
      description: conversation.triage.description,
    };

    // Light, non-persisted hint for the AI call only — attachment content is never
    // extracted or parsed (RAG is out of scope); Message.content keeps the user's raw text.
    const question =
      savedAttachments.length > 0
        ? `${trimmedContent}\n\n[Anexos enviados: ${savedAttachments.map((attachment) => attachment.fileName).join(", ")}]`
        : trimmedContent;

    const chatInput: ChatInput = {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      triageContext,
      history,
      question,
    };

    let output;
    try {
      output = await provider.chat(chatInput);
    } catch {
      throw new AIProviderError(userMessage);
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        organizationId,
        role: "ASSISTANT",
        content: output.content,
        metadata: output.metadata ? { ...output.metadata } : undefined,
      },
    });

    return { userMessage, assistantMessage };
  }
}
