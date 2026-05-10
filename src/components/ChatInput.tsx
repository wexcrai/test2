import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, FileText, Paperclip, Mic, MicOff, Sparkles } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { extractTextFromPDF, readFileAsText } from '../lib/pdf';

export interface FileAttachment {
  name: string;
  type: string;
  content: string;
}

interface ChatInputProps {
  onSend: (content: string, imageBase64?: string, fileAttachment?: FileAttachment, generateImage?: boolean) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t } = useApp();
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileAttachment, setFileAttachment] = useState<FileAttachment | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      let content: string;
      if (file.type === 'application/pdf') {
        content = await extractTextFromPDF(file);
      } else {
        content = await readFileAsText(file);
      }

      setFileAttachment({
        name: file.name,
        type: file.type || 'text/plain',
        content,
      });
    } catch (err) {
      console.error('File processing error:', err);
    } finally {
      setIsProcessingFile(false);
    }
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mikrofon erişimi reddedildi:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'tr');

      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setInput(prev => prev + (prev ? ' ' : '') + data.text);
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const removeFile = () => {
    setFileAttachment(null);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !imageBase64 && !fileAttachment) || disabled || isProcessingFile) return;
    onSend(trimmed, imageBase64 || undefined, fileAttachment || undefined, imageMode);
    setInput('');
    setImageBase64(null);
    setImagePreview(null);
    setFileAttachment(null);
    if (imageMode) setImageMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasAttachment = !!(imageBase64 || fileAttachment);

  return (
    <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        {imageMode && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs text-purple-400">Görsel oluşturma modu — ne çizmemi istediğini yaz</span>
            <button onClick={() => setImageMode(false)} className="ml-auto text-purple-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {(imagePreview || fileAttachment) && (
          <div className="mb-3 flex items-start gap-2 flex-wrap">
            {imagePreview && (
              <div className="relative group">
                <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-slate-700/50 object-cover" />
                <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}
            {fileAttachment && (
              <div className="relative group">
                <div className="flex items-center gap-2 h-20 px-3 rounded-lg border border-slate-700/50 bg-slate-800/80">
                  <FileText size={20} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate max-w-[160px]">{fileAttachment.name}</p>
                    <p className="text-xs text-slate-500">{fileAttachment.type === 'application/pdf' ? 'PDF' : 'Text'}</p>
                  </div>
                </div>
                <button onClick={removeFile} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.md,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.rb,.go,.rs,.php,.sh,.yaml,.yml,.ini,.log,.sql" onChange={handleFileSelect} className="hidden" />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessingFile}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${fileAttachment ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'}`}
            title="Dosya ekle"
          >
            <Paperclip size={18} />
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${imageBase64 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'}`}
            title="Resim ekle"
          >
            <ImagePlus size={18} />
          </button>

          <button
            onClick={() => setImageMode(!imageMode)}
            disabled={disabled}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${imageMode ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'}`}
            title="Görsel oluştur"
          >
            <Sparkles size={18} />
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isTranscribing}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${isRecording ? 'bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse' : isTranscribing ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'}`}
            title={isRecording ? 'Kaydı durdur' : 'Sesli mesaj'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isProcessingFile ? 'Dosya isleniyor...' : isTranscribing ? 'Ses yazıya çevriliyor...' : imageMode ? 'Ne çizmemi istiyorsun?' : t.chat.typeMessage}
            rows={1}
            disabled={disabled || isProcessingFile || isTranscribing}
            className="flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
          />

          <button
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && !hasAttachment) || isProcessingFile}
            className="shrink-0 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
