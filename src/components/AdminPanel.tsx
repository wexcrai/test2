import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Users, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
  messageCount?: number;
}

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'conversations'>('users');
  const [loading, setLoading] = useState(true);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});

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
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Users size={16} />
            Sohbetler
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <MessageSquare size={16} />
            Mesajlar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'users' ? (
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
                      <p className="text-slate-600 text-xs">{conv.user_id}</p>
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
          ) : (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm mb-4">Tüm sohbet mesajları</p>
              {conversations.map(conv => (
                <div key={conv.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <p className="text-white text-sm font-medium">{conv.title}</p>
                  <p className="text-slate-500 text-xs mt-1">{new Date(conv.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
