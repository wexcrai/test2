import { useState, useEffect } from 'react';
import { X, Trash2, Pencil, Check, Brain, Tag } from 'lucide-react';
import { getMemories, deleteMemory, updateMemory, type Memory } from '../lib/memoryService';
import { supabase } from '../lib/supabase';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  personal: '👤 Kişisel',
  preference: '⭐ Tercih',
  fact: '📌 Bilgi',
  general: '💬 Genel',
};

const CATEGORY_COLORS: Record<string, string> = {
  personal: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  preference: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  fact: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  general: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export function MemoryModal({ isOpen, onClose }: MemoryModalProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen) loadMemories();
  }, [isOpen]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const data = await getMemories(session.user.id);
      setMemories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditingText(memory.memory);
  };

  const handleSave = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await updateMemory(id, editingText.trim());
      setMemories(prev => prev.map(m => m.id === id ? { ...m, memory: editingText.trim() } : m));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Tüm hafızalar silinsin mi?')) return;
    try {
      await Promise.all(memories.map(m => deleteMemory(m.id)));
      setMemories([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = activeCategory === 'all'
    ? memories
    : memories.filter(m => m.category === activeCategory);

  const categories = ['all', ...Array.from(new Set(memories.map(m => m.category)))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Hafıza</h2>
            {memories.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {memories.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memories.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Tümünü Sil
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Kategori filtreleri */}
        {memories.length > 0 && (
          <div className="flex gap-1.5 px-5 py-3 border-b border-slate-700/50 shrink-0 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                  activeCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? `🧠 Tümü (${memories.length})` : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            </div>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Brain size={40} className="text-slate-600" />
              <p className="text-slate-400 text-sm">Henüz hafıza yok.</p>
              <p className="text-slate-500 text-xs max-w-xs">
                Konuştukça AI senden öğrendiklerini buraya kaydeder.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Bu kategoride hafıza yok.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(memory => (
                <div
                  key={memory.id}
                  className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                >
                  <Tag size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingId === memory.id ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSave(memory.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded border border-emerald-500/50 focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-200 leading-relaxed">{memory.memory}</p>
                    )}
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.general}`}>
                      {CATEGORY_LABELS[memory.category] || memory.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId === memory.id ? (
                      <button
                        onClick={() => handleSave(memory.id)}
                        className="p-1 rounded text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(memory)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-300 transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(memory.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
