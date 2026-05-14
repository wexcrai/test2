import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

const PROJECT_SYSTEM_PROMPT = `Sen Zenkus AI'sın ama şu an özel bir moddasın. 
Kullanıcı sana Zenkus AI projesi hakkında sorular soruyor ve sen bu projeyi yapan kişinin asistanı gibi davranıyorsun.
Şu bilgileri kullan:
- Proje adı: Zenkus AI (zenkus-ai.netlify.app)
- Kullanılan teknolojiler: React, TypeScript, Tailwind CSS, Supabase, Groq AI, Netlify
- Özellikler: Yapay zeka sohbet, sesli mesaj, görsel oluşturma, PDF okuma, web arama, kullanıcı sistemi
- Kullanılan API'ler: Groq API (yapay zeka), Tavily API (web arama), Pollinations AI (görsel)
- Site Netlify'da yayında, veritabanı Supabase'de
- Proje tek başına geliştirildi, Claude AI yardımıyla kodlandı
Sorulara kısa, anlaşılır ve Türkçe cevap ver. Konuşma sınavı havasında ol.`;

export function AuthScreen() {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [projectMode, setProjectMode] = useState(false);
  const [projectInput, setProjectInput] = useState('');
  const [projectMessages, setProjectMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Merhaba! Ben Zenkus AI projesi hakkında sorularını yanıtlamak için buradayım. Ne öğrenmek istiyorsun?' }
  ]);
  const [projectLoading, setProjectLoading] = useState(false);

  const handleProjectSend = async () => {
    if (!projectInput.trim() || projectLoading) return;
    const userMsg = projectInput.trim();
    setProjectInput('');
    setProjectMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setProjectLoading(true);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: PROJECT_SYSTEM_PROMPT },
            ...projectMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg }
          ],
          max_tokens: 512,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Cevap alınamadı.';
      setProjectMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setProjectMessages(prev => [...prev, { role: 'assistant', content: 'Bir hata oluştu, tekrar dene.' }]);
    } finally {
      setProjectLoading(false);
    }
  };

  const checkBan = async (email: string): Promise<boolean> => {
    const { data } = await supabase
      .from('banned_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    return !!data;
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const banned = await checkBan(email);
      if (banned) {
        setError('Bu hesap engellenmiştir. Destek için iletişime geçin.');
        return;
      }
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(t.auth.registerSuccess);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showWarning) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="bg-slate-900 p-8 rounded-2xl border border-yellow-500/30 w-full max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-yellow-400 mb-4">UYARI</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            YAPAY ZEKA BETA (TEST) SÜRÜMÜNDEDİR. GÖRSEL OLUŞTURMADA BAZI SORUNLAR ORTAYA ÇIKABİLİR!
          </p>
          <button
            onClick={() => setShowWarning(false)}
            className="w-full px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold transition-colors"
          >
            Tamam, Anladım
          </button>
        </div>
      </div>
    );
  }

  if (projectMode) {
    return (
      <div className="h-screen flex flex-col bg-slate-950">
        <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-slate-700/50 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-200">🎓 Proje Tanıtım Modu</span>
          </div>
          <button
            onClick={() => setProjectMode(false)}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 transition-colors"
          >
            ← Geri
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {projectMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {projectLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-slate-800 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/80 p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProjectSend()}
              placeholder="Proje hakkında bir şey sor..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleProjectSend}
              disabled={projectLoading || !projectInput.trim()}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">{t.auth.welcome}</h1>
        <p className="text-slate-400 text-center mb-6 text-sm">
          {isLogin ? t.auth.loginPrompt : t.auth.registerPrompt}
        </p>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {message}
          </div>
        )}

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
          </svg>
          {t.auth.googleLogin}
        </button>

        <button
          onClick={handleGuest}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors mb-3 disabled:opacity-50"
        >
          👤 Misafir olarak devam et
        </button>

        <button
          onClick={() => setProjectMode(true)}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 font-medium transition-colors mb-4"
        >
          🎓 Proje
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-sm">{t.auth.or}</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <input
          type="email"
          placeholder={t.auth.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 mb-3 focus:outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          placeholder={t.auth.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {loading ? t.auth.loading : isLogin ? t.auth.login : t.auth.register}
        </button>

        <p className="text-center text-slate-400 text-sm mt-4">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-400 hover:underline">
            {isLogin ? t.auth.register : t.auth.login}
          </button>
        </p>
      </div>
    </div>
  );
}
