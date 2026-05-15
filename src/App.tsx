import { useState, useRef, useEffect } from 'react';
import { Menu, AlertCircle, LogOut, Settings, Shield, Download } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthScreen } from './components/AuthScreen';
import { SettingsModal } from './components/SettingsModal';
import { AdminPanel } from './components/AdminPanel';
import { useChat } from './hooks/useChat';
import { supabase } from './lib/supabase';
import { AppProvider, useApp } from './contexts/AppContext';
import { requestNotificationPermission, onForegroundMessage } from './firebase';
import type { ModelType } from './components/ChatInput';

const GUEST_MESSAGE_LIMIT = 12;
const ADMIN_EMAIL = 'ilyastekkan@gmail.com';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [notification, setNotification] = useState<{title: string, body: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useApp();

  const {
    conversations,
    setConversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSendOriginal,
    selectConversation,
    createNewChat,
    removeConversation,
  } = useChat();

  const isGuest = user?.is_anonymous === true;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const totalMessages = messages.filter(m => m.role === 'user').length;

  const handleSend = async (content: string, imageBase64?: string, fileAttachment?: any, generateImage?: boolean, model?: ModelType) => {
    if (isGuest && totalMessages >= GUEST_MESSAGE_LIMIT) {
      setShowGuestWarning(true);
      return;
    }
    await handleSendOriginal(content, imageBase64, fileAttachment, generateImage, model);
    if (isGuest && totalMessages + 1 >= GUEST_MESSAGE_LIMIT) {
      setShowGuestWarning(true);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleRegenerate = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    await handleSendOriginal(lastUserMsg.content, lastUserMsg.image_base64 || undefined, lastUserMsg.file_attachment || undefined);
  };

  const handleEdit = async (newContent: string) => {
    await handleSendOriginal(newContent);
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    const title = conversations.find(c => c.id === activeConversationId)?.title || 'Sohbet';
    const content = messages.map(msg => `${msg.role === 'user' ? '👤 Sen' : '🤖 Zenkus AI'}: ${msg.content}`).join('\n\n');
    const blob = new Blob([`${title}\n${'='.repeat(title.length)}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'INITIAL_SESSION') {
        setAuthLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isGuest) {
      requestNotificationPermission().then(async (token) => {
        if (token) {
          await supabase.from('push_tokens').upsert({ token, user_id: user.id }, { onConflict: 'token' });
        }
      });

      const unsubscribe = onForegroundMessage((payload) => {
        setNotification({
          title: payload.notification?.title || 'Bildirim',
          body: payload.notification?.body || ''
        });
        setTimeout(() => setNotification(null), 5000);
      });
      return () => unsubscribe();
    }
  }, [user, isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );

  if (!user) return <AuthScreen />;

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">

      {notification && (
        <div className="fixed top-4 right-4 z-[100] bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-sm animate-pulse">
          <p className="text-white font-medium text-sm">{notification.title}</p>
          <p className="text-slate-400 text-xs mt-1">{notification.body}</p>
        </div>
      )}

      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        isOpen={sidebarOpen}
        onSelect={selectConversation}
        onNew={createNewChat}
        onDelete={removeConversation}
        onClose={() => setSidebarOpen(false)}
        onRename={handleRename}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <h1 className="text-sm font-medium text-slate-200 truncate">
              {activeConversationId
                ? conversations.find((c) => c.id === activeConversationId)?.title || t.chat.chat
                : t.chat.newChat}
            </h1>
          </div>
          {isGuest && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
              Misafir ({totalMessages}/{GUEST_MESSAGE_LIMIT})
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sohbeti indir"
            >
              <Download size={18} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setAdminOpen(true)}
              className="p-2 rounded-lg text-emerald-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Admin Paneli"
            >
              <Shield size={18} />
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t.settings.title}
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t.settings.logout}
          >
            <LogOut size={18} />
          </button>
        </header>

        {isGuest && totalMessages >= GUEST_MESSAGE_LIMIT - 2 && !showGuestWarning && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {GUEST_MESSAGE_LIMIT - totalMessages} mesaj hakkınız kaldı. Devam etmek için hesap oluşturun!
          </div>
        )}

        {showGuestWarning && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-md text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-white mb-2">Mesaj limitine ulaştınız!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Misafir olarak {GUEST_MESSAGE_LIMIT} mesaj hakkınız var. Sınırsız kullanım için ücretsiz hesap oluşturun.
              </p>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                Hesap Oluştur / Giriş Yap
              </button>
            </div>
          </div>
        )}

        {!showGuestWarning && (
          <>
            {error && (
              <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {messages.length === 0 && !isSending ? (
              <WelcomeScreen />
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLast={index === messages.length - 1}
                    onRegenerate={msg.role === 'assistant' && index === messages.length - 1 ? handleRegenerate : undefined}
                    onEdit={msg.role === 'user' && index === messages.length - 1 ? handleEdit : undefined}
                  />
                ))}
                {isSending && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}

            {isLoading && messages.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}

            <ChatInput onSend={handleSend} disabled={isSending} />
          </>
        )}
      </main>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      <span className="fixed bottom-3 right-3 text-[10px] font-medium tracking-wider uppercase text-slate-500/40 select-none pointer-events-none">
        Beta
      </span>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
