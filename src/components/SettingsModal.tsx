import { useState } from 'react';
import { X, Sun, Moon, Globe, Lock, Trash2, AlertTriangle, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, lang, t, setTheme, setLang } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('system-prompt') || '');
  const [promptSaved, setPromptSaved] = useState(false);

  if (!isOpen) return null;

  const handleSavePrompt = () => {
    localStorage.setItem('system-prompt', systemPrompt);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t.settings.passwordMismatch });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: t.settings.passwordChanged });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete account');
      }
      await supabase.auth.signOut();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">{t.settings.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* System Prompt */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Bot size={16} className="text-purple-400" />
              AI Karakter Ayarı
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Örnek: Sen bir tarih öğretmenisin. Tüm cevaplarını tarihi olaylarla ilişkilendir."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSavePrompt}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                {promptSaved ? '✓ Kaydedildi!' : 'Kaydet'}
              </button>
              {systemPrompt && (
                <button
                  onClick={() => { setSystemPrompt(''); localStorage.removeItem('system-prompt'); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm hover:text-white transition-colors"
                >
                  Sıfırla
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">AI'nın nasıl davranacağını özelleştir. Boş bırakırsan varsayılan davranış kullanılır.</p>
          </div>

          {/* Theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Sun size={16} className="text-amber-400" />
              {t.settings.theme}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Moon size={18} />
                <span className="text-sm font-medium">{t.settings.darkMode}</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  theme === 'light'
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Sun size={18} />
                <span className="text-sm font-medium">{t.settings.lightMode}</span>
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Globe size={16} className="text-blue-400" />
              {t.settings.language}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLang('tr')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  lang === 'tr'
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-lg">🇹🇷</span>
                <span className="text-sm font-medium">{t.settings.turkish}</span>
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  lang === 'en'
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-lg">🇬🇧</span>
                <span className="text-sm font-medium">{t.settings.english}</span>
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Lock size={16} className="text-emerald-400" />
              {t.settings.changePassword}
            </label>
            <div className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.settings.newPassword}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.settings.confirmPassword}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {passwordMsg && (
                <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passwordMsg.text}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {passwordLoading ? '...' : t.settings.save}
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="pt-2 border-t border-slate-700/50">
            <label className="flex items-center gap-2 text-sm font-medium text-red-400 mb-3">
              <Trash2 size={16} />
              {t.settings.deleteAccount}
            </label>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-600/20 transition-colors"
              >
                {t.settings.deleteAccount}
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-red-600/5 border border-red-500/20 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <p className="text-sm text-red-300">{t.settings.deleteAccountWarning}</p>
                </div>
                <p className="text-sm text-slate-400">{t.settings.deleteAccountConfirm}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? '...' : t.settings.confirm}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    {t.settings.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
