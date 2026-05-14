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
}

export async function sendMessage(
  message: string,
  conversationId?: string,
  imageBase64?: string,
  fileAttachment?: FileAttachmentData,
  generateImage?: boolean,
  model?: 'fast' | 'smart',
): Promise<ChatResponse> {
  const headers = await getHeaders();
  const body: Record<string, unknown> = { message };
  if (conversationId) body.conversationId = conversationId;
  if (imageBase64) body.imageBase64 = imageBase64;
  if (fileAttachment) body.fileAttachment = fileAttachment;
  if (generateImage) body.generateImage = true;
  if (model) body.model = model;

  const customPrompt = localStorage.getItem('system-prompt');
  if (customPrompt) body.systemPrompt = customPrompt;

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Mesaj gonderilemedi.');
  }
  return res.json();
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
