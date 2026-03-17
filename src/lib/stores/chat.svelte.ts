import type { Message } from "$lib/tauri/types";

let messages = $state<Message[]>([]);
let streamingContent = $state("");
let streamingMessageId = $state<string | null>(null);
let isStreaming = $derived(streamingMessageId !== null);

export const chatStore = {
  get messages() { return messages; },
  get streamingContent() { return streamingContent; },
  get isStreaming() { return isStreaming; },
  addMessage(msg: Message) { messages.push(msg); },
  appendStreamChunk(chunk: string) { streamingContent += chunk; },
  startStream(id: string) { streamingMessageId = id; streamingContent = ""; },
  finalizeStream(id: string, thinking?: string) {
    messages.push({ role: "agent", type: "text", id, timestamp: new Date().toISOString(), content: streamingContent, thinking });
    streamingContent = "";
    streamingMessageId = null;
  },
  clearMessages() { messages = []; streamingContent = ""; streamingMessageId = null; },
  snapshot(): Message[] { return [...messages]; },
  restore(msgs: Message[]) { messages = msgs; streamingContent = ""; streamingMessageId = null; },
};
