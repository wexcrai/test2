import { User, Bot, FileText } from 'lucide-react';
import type { Message } from '../lib/api';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
          <Bot size={16} className="text-emerald-400" />
        </div>
      )}

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 font-medium">Kaynaklar</p>
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
