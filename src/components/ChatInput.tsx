import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, FileText, Paperclip } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { extractTextFromPDF, readFileAsText } from '../lib/pdf';

export interface FileAttachment {
  name: string;
  type: string;
  content: string;
}

interface ChatInputProps {
  onSend: (content: string, imageBase64?: string, fileAttachment?: FileAttachment) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t } = useApp();
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileAttachment, setFileAttachment] = useState<FileAttachment | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onSend(trimmed, imageBase64 || undefined, fileAttachment || undefined);
    setInput('');
    setImageBase64(null);
    setImagePreview(null);
    setFileAttachment(null);
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
        {(imagePreview || fileAttachment) && (
          <div className="mb-3 flex items-start gap-2 flex-wrap">
            {imagePreview && (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 rounded-lg border border-slate-700/50 object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors"
                >
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
                    <p className="text-xs text-slate-500">
                      {fileAttachment.type === 'application/pdf' ? 'PDF' : 'Text'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv,.md,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.rb,.go,.rs,.php,.sh,.yaml,.yml,.ini,.log,.sql"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessingFile}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
              fileAttachment
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title="Dosya ekle"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            className={`shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
              imageBase64
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title="Resim ekle"
          >
            <ImagePlus size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isProcessingFile ? 'Dosya isleniyor...' : t.chat.typeMessage}
            rows={1}
            disabled={disabled || isProcessingFile}
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
