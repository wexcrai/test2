import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, MessageSquare, ChevronDown, ChevronUp, Terminal, Bell } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<'conversations' | 'commands' | 'notifications'>('conversations');
  const [loading, setLoading] = useState(true);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [command, setCommand] = useState('');
  const [commandLog, setCommandLog] = useState<string[]>(['Zenkus Admin Konsolu v1.0', 'Komutlar: !ban <email>, !unban <email>, !listban']);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifLog, setNotifLog] = useState<string[]>([]);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      setConversations(convs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    if (messages[convId]) {
      setExpandedConv(expandedConv === convId ? null : convId);
      return;
    }
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(prev => ({ ...prev, [convId]: data || [] }));
    setExpandedConv(convId);
  };

  const handleCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;

    setCommandLog(prev => [...prev, `> ${cmd}`]);
    setCommand('');

    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    const target = parts[1];

    if (action === '!ban') {
      if (!target) { setCommandLog(prev => [...prev, '❌ Kullanım: !ban <email>']); return; }
      const { error } = await supabase.from('banned_users').insert({ email: target, reason: 'Admin tarafından banlandı' });
      if (error) setCommandLog(prev => [...prev, `❌ Hata: ${error.message}`]);
      else setCommandLog(prev => [...prev, `✅ ${target} banlandı!`]);
    } else if (action === '!unban') {
      if (!target) { setCommandLog(prev => [...prev, '❌ Kullanım: !unban <email>']); return; }
      const { error } = await supabase.from('banned_users').delete().eq('email', target);
      if (error) setCommandLog(prev => [...prev, `❌ Hata: ${error.message}`]);
      else setCommandLog(prev => [...prev, `✅ ${target} banı kaldırıldı!`]);
    } else if (action === '!listban') {
      const { data, error } = await supabase.from('banned_users').select('*');
      if (error) setCommandLog(prev => [...prev, `❌ Hata: ${error.message}`]);
      else if (!data || data.length === 0) setCommandLog(prev => [...prev, '📋 Banlı kullanıcı yok.']);
      else {
        setCommandLog(prev => [...prev, `📋 Banlı kullanıcılar (${data.length}):`]);
        data.forEach((u: any) => setCommandLog(prev => [...prev, `  - ${u.email || u.user_id}`]));
      }
    } else {
      setCommandLog(prev => [...prev, `❌ Bilinmeyen komut: ${action}`]);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      setNotifLog(prev => [...prev, '❌ Başlık ve mesaj boş olamaz!']);
      return;
    }

    setNotifSending(true);
    setNotifLog(prev => [...prev, `📤 Bildirim gönderiliyor...`]);

    try {
      const { data: tokens } = await supabase.from('push_tokens').select('token');
      if (!tokens || tokens.length === 0) {
        setNotifLog(prev => [...prev, '❌ Kayıtlı token yok, hiç kullanıcı bildirim izni vermemiş.']);
        return;
      }

      setNotifLog(prev => [...prev, `📱 ${tokens.length} kullanıcıya gönderiliyor...`]);

      const res = await fetch('https://fcm.googleapis.com/v1/projects/zenkus-ai/messages:send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_FIREBASE_API_KEY}`,
        },
        body: JSON.stringify({
          message: {
            notification: { title: notifTitle, body: notifBody },
            webpush: {
              notification: {
                title: notifTitle,
                body: notifBody,
                icon: '/pwa-192x192.png',
              }
            },
            token: tokens[0].token,
          }
        }),
      });

      if (res.ok) {
        setNotifLog(prev => [...prev, `✅ Bildirim gönderildi! (${tokens.length} kullanıcı)`]);
        setNotifTitle('');
        setNotifBody('');
      } else {
        const err = await res.json();
        setNotifLog(prev => [...prev, `❌ Hata: ${JSON.stringify(err)}`]);
      }
    } catch (err: any) {
      setNotifLog(prev => [...prev, `❌ Hata: ${err.message}`]);
    } finally {
      setNotifSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">🛡️ Admin Paneli</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <MessageSquare size={16} />
            Sohbetler
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'commands' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Terminal size={16} />
            Komutlar
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Bell size={16} />
            Bildirim
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'conversations' ? (
            loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm mb-4">Toplam {conversations.length} sohbet</p>
                {conversations.map(conv => (
                  <div key={conv.id} className="bg-slate-800 rounded-xl border border-slate-700">
                    <button
                      onClick={() => loadMessages(conv.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{conv.title}</p>
                        <p className="text-slate-500 text-xs mt-1">{new Date(conv.created_at).toLocaleString('tr-TR')}</p>
                        <p className="text-slate-600 text-xs font-mono">{conv.user_id}</p>
                      </div>
                      {expandedConv === conv.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {expandedConv === conv.id && messages[conv.id] && (
                      <div className="border-t border-slate-700 p-4 space-y-2">
                        {messages[conv.id].map((msg: any) => (
                          <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-slate-700 text-slate-200' : 'bg-emerald-900/30 text-emerald-200'}`}>
                            <span className="font-medium text-xs opacity-60">{msg.role === 'user' ? '👤 Kullanıcı' : '🤖 Zenkus AI'}</span>
                            <p className="mt-1">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'commands' ? (
            <div className="flex flex-col h-full gap-3">
              <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-y-auto min-h-[300px]">
                {commandLog.map((log, i) => (
                  <div key={i} className={`mb-1 ${log.startsWith('>') ? 'text-emerald-400' : log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {log}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  ref={commandInputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                  placeholder="!ban email@ornek.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
                <button
                  onClick={handleCommand}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors text-sm"
                >
                  Çalıştır
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">Tüm kullanıcılara push bildirim gönder.</p>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Başlık</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Yeni güncelleme!"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mesaj</label>
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Zenkus AI'ye yeni özellikler eklendi!"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                />
              </div>
              <button
                onClick={handleSendNotification}
                disabled={notifSending}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors text-sm disabled:opacity-50"
              >
                {notifSending ? 'Gönderiliyor...' : '📤 Bildirim Gönder'}
              </button>
              {notifLog.length > 0 && (
                <div className="bg-slate-950 rounded-xl p-4 font-mono text-sm space-y-1">
                  {notifLog.map((log, i) => (
                    <div key={i} className={log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-emerald-400' : 'text-slate-400'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
