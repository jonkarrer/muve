import type { Message } from "$lib/tauri/types";

let messages = $state<Message[]>([]);
let streamingContent = $state("");
let streamingMessageId = $state<string | null>(null);
let isStreaming = $derived(streamingMessageId !== null);

function addMessage(msg: Message) {
  messages.push(msg);
}

function appendStreamChunk(chunk: string) {
  streamingContent += chunk;
}

function finalizeStream(id: string, thinking?: string) {
  messages.push({
    role: "agent",
    type: "text",
    id,
    timestamp: new Date().toISOString(),
    content: streamingContent,
    thinking,
  });
  streamingContent = "";
  streamingMessageId = null;
}

function clearMessages() {
  messages = [];
  streamingContent = "";
  streamingMessageId = null;
}

export const chatStore = {
  get messages() { return messages; },
  get streamingContent() { return streamingContent; },
  get streamingMessageId() { return streamingMessageId; },
  get isStreaming() { return isStreaming; },
  addMessage,
  appendStreamChunk,
  finalizeStream,
  clearMessages,
  startStream(id: string) { streamingMessageId = id; streamingContent = ""; },
};
