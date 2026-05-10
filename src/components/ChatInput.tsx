import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface ChatInputProps {
  onSend: (content: string, imageBase64?: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { t } = useApp();
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !imageBase64) || disabled) return;
    onSend(trimmed, imageBase64 || undefined);
    setInput('');
    setImageBase64(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        {imagePreview && (
          <div className="mb-3 flex items-start gap-2">
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
          </div>
        )}
        <div className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`shrink-0 p-3 rounded-xl transition-colors disabled:opacity-40 ${
              imageBase64
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={t.chat.typeMessage}
          >
            <ImagePlus size={18} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.typeMessage}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && !imageBase64)}
            className="shrink-0 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
