import { useState, useCallback } from 'react';
import { User, Bot, FileText, Copy, Check, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useApp } from '../contexts/AppContext';
import type { Message } from '../lib/api';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { t, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const copyLabel = lang === 'tr' ? 'Kopyalandı!' : 'Copied!';
  const copyTitle = lang === 'tr' ? 'Kopyala' : 'Copy';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = 'tr-TR';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [message.content, isSpeaking]);

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
          <Bot size={16} className="text-emerald-400" />
        </div>
      )}

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              title={copyTitle}
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span className={copied ? 'text-emerald-400' : ''}>{copied ? copyLabel : copyTitle}</span>
            </button>
            <button
              onClick={handleSpeak}
              className={`flex items-center gap-1 text-xs transition-colors ${isSpeaking ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              title={isSpeaking ? 'Durdur' : 'Sesli oku'}
            >
              {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isSpeaking ? 'Durdur' : 'Sesli oku'}</span>
            </button>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
          }`}
        >
          {isUser && message.image_base64 && (
            <img
              src={message.image_base64}
              alt="Uploaded"
              className="max-h-48 rounded-lg mb-2 border border-white/10"
            />
          )}
          {isUser && message.file_attachment && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10">
              <FileText size={16} className="shrink-0 text-emerald-200" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{message.file_attachment.name}</p>
                <p className="text-xs text-emerald-200/70">
                  {message.file_attachment.type === 'application/pdf' ? 'PDF' : 'Text'}
                </p>
              </div>
            </div>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 font-medium">{t.chat.sources}</p>
            <div className="space-y-1">
              {message.sources.map((source, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400"
                >
                  <FileText size={12} className="shrink-0 mt-0.5 text-slate-500" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-300 truncate">{source.title}</p>
                    <p className="truncate text-slate-500">{source.chunk}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
          <User size={16} className="text-slate-300" />
        </div>
      )}
    </div>
  );
}
