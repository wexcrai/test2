import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sendMessage,
  getConversations,
  getMessages,
  deleteConversation,
  type Conversation,
  type Message,
  type Source,
} from '../lib/api';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const initialLoadDone = useRef(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sohbetler yuklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadConversations();
    }
  }, [loadConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setIsLoading(true);
    setError(null);
    setSources([]);
    try {
      const msgs = await getMessages(id);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesajlar yuklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSources([]);
    setError(null);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) return;
      setIsSending(true);
      setError(null);
      setSources([]);

      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversationId || '',
        role: 'user',
        content,
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const response = await sendMessage(content, activeConversationId || undefined);
        if (!activeConversationId) setActiveConversationId(response.conversationId);

        const assistantMsg: Message = {
          id: `res-${Date.now()}`,
          conversation_id: response.conversationId,
          role: 'assistant',
          content: response.textResponse,
          sources: response.sources,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setSources(response.sources);
        await loadConversations();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Mesaj gonderilemedi.');
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, isSending, loadConversations],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
          setSources([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sohbet silinemedi.');
      }
    },
    [activeConversationId],
  );

  return {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    error,
    sources,
    sendMessage: handleSendMessage,
    selectConversation,
    createNewChat,
    removeConversation,
  };
}
