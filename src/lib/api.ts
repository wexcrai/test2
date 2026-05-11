import { supabase } from './supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function getHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export interface Source {
  title: string;
  chunk: string;
}

export interface FileAttachmentData {
  name: string;
  type: string;
  content: string;
}

export interface ChatResponse {
  conversationId: string;
  textResponse: string;
  sources: Source[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_base64?: string | null;
  file_attachment?: FileAttachmentData | null;
  sources: Source[];
  created_at: string;
  isStreaming?: boolean;
}

export type StreamCallback = (token: string) => void;
export type StreamDoneCallback = (response: ChatResponse) => void;

export async function sendMessageStream(
  message: string,
  onToken: StreamCallback,
  onDone: StreamDoneCallback,
  conversationId?: string,
  imageBase64?: string,
  fileAttachment?: FileAttachmentData,
  generateImage?: boolean,
): Promise<void> {
  const headers = await getHeaders();
  const body: Record<string, unknown> = { message };
  if (conversationId) body.conversationId = conversationId;
  if (imageBase64) body.imageBase64 = imageBase64;
  if (fileAttachment) body.fileAttachment = fileAttachment;
  if (generateImage) body.generateImage = true;

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Mesaj gonderilemedi.' }));
    throw new Error(err.error || 'Mesaj gonderilemedi.');
  }

  const contentType = res.headers.get('Content-Type') || '';

  if (contentType.includes('text/event-stream')) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'token' && parsed.token) {
            onToken(parsed.token);
          } else if (parsed.type === 'done') {
            onDone({
              conversationId: parsed.conversationId,
              textResponse: parsed.textResponse,
              sources: parsed.sources || [],
            });
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error || 'Stream error');
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Stream error') throw e;
        }
      }
    }
  } else {
    const data = await res.json();
    onDone({
      conversationId: data.conversationId,
      textResponse: data.textResponse,
      sources: data.sources || [],
    });
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const headers = await getHeaders();
  const res = await fetch(FUNCTION_URL, { method: 'GET', headers });
  if (!res.ok) throw new Error('Sohbetler yuklenemedi.');
  const data = await res.json();
  return data.conversations;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const headers = await getHeaders();
  const res = await fetch(`${FUNCTION_URL}?conversationId=${conversationId}`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error('Mesajlar yuklenemedi.');
  const data = await res.json();
  return data.messages;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${FUNCTION_URL}?conversationId=${conversationId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Sohbet silinemedi.');
}
