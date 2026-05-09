import { useState, useRef, useEffect } from 'react';
import { Menu, AlertCircle, LogOut } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthScreen } from './components/AuthScreen';
import { useChat } from './hooks/useChat';
import { supabase } from './lib/supabase';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    error,
    sendMessage: handleSend,
    selectConversation,
    createNewChat,
    removeConversation,
  } = useChat();

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
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        isOpen={sidebarOpen}
        onSelect={selectConversation}
        onNew={createNewChat}
        onDelete={removeConversation}
        onClose={() => setSidebarOpen(false)}
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
                ? conversations.find((c) => c.id === activeConversationId)?.title || 'Sohbet'
                : 'Yeni Sohbet'}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut size={18} />
          </button>
        </header>

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
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
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
      </main>
    </div>
  );
}

export default App;
