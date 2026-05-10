import { MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function WelcomeScreen() {
  const { t } = useApp();

  const suggestions = [
    { icon: MessageSquare, text: t.welcome.suggestion1 },
    { icon: Sparkles, text: t.welcome.suggestion2 },
    { icon: BookOpen, text: t.welcome.suggestion3 },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t.welcome.title}</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          {t.welcome.description}
        </p>
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-slate-400 text-sm hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-default"
            >
              <s.icon size={16} className="shrink-0 text-slate-500" />
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
