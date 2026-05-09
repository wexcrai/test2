import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
        <Bot size={16} className="text-emerald-400" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-slate-800 border border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
