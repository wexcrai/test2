import { useState, useCallback } from 'react';
import { User, Bot, FileText, Copy, Check, Volume2, VolumeX, RefreshCw, Pencil, X, ThumbsUp, ThumbsDown, Play, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useApp } from '../contexts/AppContext';
import type { Message } from '../lib/api';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  isLast?: boolean;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const runCode = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language === 'js' ? 'javascript' : language,
          version: '*',
          files: [{ content: code }],
        }),
      });
      const data = await res.json();
      const result = data.run?.stdout || data.run?.stderr || data.compile?.stderr || 'Çıktı yok';
      setOutput(result);
    } catch {
      setOutput('Hata: Kod çalıştırılamadı.');
    } finally {
      setRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canRun = ['python', 'javascript', 'js', 'typescript', 'ts', 'java', 'c', 'cpp', 'rust', 'go', 'ruby', 'php'].includes(language?.toLowerCase());

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{language || 'kod'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
          {canRun && (
            <button
              onClick={runCode}
              disabled={running}
              className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              {running ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
              <span>{running ? 'Çalışıyor...' : 'Çalıştır'}</span>
            </button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto bg-slate-950 text-sm">
        <code>{code}</code>
      </pre>
      {output !== null && (
        <div className="border-t border-slate-700 bg-slate-900 p-4">
          <p className="text-xs text-slate-500 mb-2">Çıktı:</p>
          <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message, onRegenerate, onEdit, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { t, lang } = useApp();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);

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

  const handleEditSave = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

 const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const code = Array.isArray(children) 
        ? children.join('') 
        : String(children).replace(/\n$/, '');

      if (!inline && (language || code.includes('\n'))) {
        return <CodeBlock language={language || 'text'} code={code} />;
      }
      return (
        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
  };
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
          <Bot size={16} className="text-emerald-400" />
        </div>
      )}

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end flex flex-col' : 'items-start'}`}>
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
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                title="Yeniden oluştur"
              >
                <RefreshCw size={12} />
                <span>Yeniden oluştur</span>
              </button>
            )}
            <button
              onClick={() => setLiked(liked === 'up' ? null : 'up')}
              className={`flex items-center gap-1 text-xs transition-colors ${liked === 'up' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Beğen"
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={() => setLiked(liked === 'down' ? null : 'down')}
              className={`flex items-center gap-1 text-xs transition-colors ${liked === 'down' ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Beğenme"
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}

        {isUser && isLast && onEdit && !isEditing && (
          <button
            onClick={() => { setIsEditing(true); setEditContent(message.content); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors self-end opacity-100"
            title="Düzenle"
          >
            <Pencil size={12} />
            <span>Düzenle</span>
          </button>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
          }`}
        >
          {isUser && message.image_base64 && (
            <img src={message.image_base64} alt="Uploaded" className="max-h-48 rounded-lg mb-2 border border-white/10" />
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
            isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-emerald-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleEditSave} className="px-3 py-1 bg-white text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-50 transition-colors">
                    Gönder
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs hover:bg-emerald-800 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
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
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs text-slate-400">
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
