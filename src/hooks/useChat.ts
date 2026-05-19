import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sendMessage,
  getConversations,
  getMessages,
  deleteConversation,
  type Conversation,
  type Message,
  type Source,
  type FileAttachmentData,
} from '../lib/api';
import { useApp } from '../contexts/AppContext';

export function useChat() {
  const { t } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const streamedTextRef = useRef('');
  const initialLoadDone = useRef(false);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch {
      setError(t.errors.loadConversations);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
    } catch {
      setError(t.errors.loadMessages);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const createNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSources([]);
    setError(null);
    setStreamingContent('');
    streamedTextRef.current = '';
  }, []);

  const handleSendMessage = useCallback(
    async (
      content: string,
      imageBase64?: string,
      fileAttachment?: FileAttachmentData,
      generateImage?: boolean,
      model?: 'fast' | 'smart',
    ) => {
      if ((!content.trim() && !imageBase64 && !fileAttachment) || isSending) return;
      setIsSending(true);
      setError(null);
      setSources([]);
      setStreamingContent('');
      streamedTextRef.current = '';

      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversationId || '',
        role: 'user',
        content,
        image_base64: imageBase64 || null,
        file_attachment: fileAttachment || null,
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const response = await sendMessage(
          content,
          activeConversationId || undefined,
          imageBase64,
          fileAttachment,
          generateImage,
          model,
          generateImage
            ? undefined
            : (chunk: string) => {
                streamedTextRef.current += chunk;
                setStreamingContent(streamedTextRef.current);
              },
        );

        if (!activeConversationId) setActiveConversationId(response.conversationId);

        const finalContent = response.textResponse || streamedTextRef.current;

        const assistantMsg: Message = {
          id: `res-${Date.now()}`,
          conversation_id: response.conversationId,
          role: 'assistant',
          content: finalContent,
          sources: response.sources || [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setSources(response.sources || []);
        setStreamingContent('');
        streamedTextRef.current = '';
        setIsSending(false);
        await loadConversations();
      } catch {
        setError(t.errors.sendMessage);
        setIsSending(false);
        setStreamingContent('');
        streamedTextRef.current = '';
      }
    },
    [activeConversationId, isSending, loadConversations, t],
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
          setStreamingContent('');
          streamedTextRef.current = '';
        }
      } catch {
        setError(t.errors.deleteConversation);
      }
    },
    [activeConversationId, t],
  );

  return {
    conversations,
    setConversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    error,
    sources,
    streamingContent,
    sendMessage: handleSendMessage,
    selectConversation,
    createNewChat,
    removeConversation,
  };
}
