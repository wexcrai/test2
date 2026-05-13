import { useState } from 'react';
import { X, Plus, MessageSquare, Trash2, Pencil, Check, Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import type { Conversation } from '../lib/api';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onRename: (id: string, newTitle: string) => void;
}

export function Sidebar({ conversations, activeId, isOpen, onSelect, onNew, onDelete, onClose, onRename }: SidebarProps) {
  const { t } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveEdit = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editingTitle.trim()) return;
    await supabase.from('conversations').update({ title: editingTitle.trim() }).eq('id', id);
    onRename(id, editingTitle.trim());
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') saveEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-700/50 flex flex-col transform transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-200">{t.chat.conversations}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNew}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t.chat.newChatBtn}
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {conversations.length > 0 && (
          <div className="px-3 py-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sohbet ara..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {filteredConversations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              {search ? 'Sonuç bulunamadı' : t.chat.noConversations}
            </p>
          ) : (
            <div className="space-y-0.5 px-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeId === conv.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                  onClick={() => editingId !== conv.id && onSelect(conv.id)}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, conv.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-1 text-sm bg-slate-700 text-white px-2 py-0.5 rounded border border-emerald-500/50 focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingId === conv.id ? (
                      <button
                        onClick={(e) => saveEdit(conv.id, e)}
                        className="p-1 rounded text-emerald-400 hover:text-emerald-300 transition-all"
                        title="Kaydet"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => startEdit(conv, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-300 transition-all"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all"
                      title={t.chat.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
