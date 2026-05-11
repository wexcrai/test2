import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sendMessageStream,
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
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, imageBase64?: string, fileAttachment?: FileAttachmentData, generateImage?: boolean) => {
      if ((!content.trim() && !imageBase64 && !fileAttachment) || isSending) return;
      setIsSending(true);
      setError(null);
      setSources([]);

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

      // Add placeholder streaming assistant message
      const streamMsgId = `stream-${Date.now()}`;
      const streamMsg: Message = {
        id: streamMsgId,
        conversation_id: activeConversationId || '',
        role: 'assistant',
        content: '',
        sources: [],
        created_at: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, streamMsg]);

      try {
        await sendMessageStream(
          content,
          // onToken
          (token: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamMsgId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          },
          // onDone
          (response) => {
            if (!activeConversationId) setActiveConversationId(response.conversationId);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamMsgId
                  ? { ...msg, content: response.textResponse, isStreaming: false, sources: response.sources }
                  : msg
              )
            );
            setSources(response.sources);
            setIsSending(false);
            loadConversations();
          },
          activeConversationId || undefined,
          imageBase64,
          fileAttachment,
          generateImage,
        );
      } catch {
        // Remove the streaming placeholder on error
        setMessages((prev) => prev.filter((msg) => msg.id !== streamMsgId));
        setError(t.errors.sendMessage);
        setIsSending(false);
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
        }
      } catch {
        setError(t.errors.deleteConversation);
      }
    },
    [activeConversationId, t],
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
