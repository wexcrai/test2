import { MessageSquare, Sparkles, BookOpen, Mic, ImagePlus, Globe } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface WelcomeScreenProps {
  onSuggestion?: (text: string) => void;
}

export function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  const { t } = useApp();

  const suggestions = [
    { icon: MessageSquare, text: t.welcome.suggestion1, color: 'text-emerald-400' },
    { icon: Sparkles, text: t.welcome.suggestion2, color: 'text-purple-400' },
    { icon: BookOpen, text: t.welcome.suggestion3, color: 'text-blue-400' },
  ];

  const features = [
    { icon: Mic, text: 'Sesli mesaj', color: 'text-red-400', bg: 'bg-red-500/10' },
    { icon: ImagePlus, text: 'Görsel analiz', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Sparkles, text: 'Görsel oluştur', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Globe, text: 'Web arama', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="text-center max-w-lg w-full">

        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-4xl font-black text-emerald-400">Z</span>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Zenkus AI</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {t.welcome.description}
        </p>

        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          {features.map((f, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${f.bg} border border-white/5`}>
              <f.icon size={13} className={f.color} />
              <span className="text-xs text-slate-300">{f.text}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion?.(s.text)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-slate-400 text-sm hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600 transition-all text-left"
            >
              <s.icon size={16} className={`shrink-0 ${s.color}`} />
              <span>{s.text}</span>
            </button>
          ))}
        </div>

        <p className="text-slate-600 text-xs mt-6">Zenkus AI hata yapabilir. Önemli bilgileri doğrulayın.</p>
      </div>
    </div>
  );
}
