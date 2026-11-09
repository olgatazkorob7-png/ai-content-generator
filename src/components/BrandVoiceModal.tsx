import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  useBrandVoice,
  exportBrandVoice,
  importBrandVoice,
  clearBrandVoice,
  saveBrandVoice,
  EMPTY_BRAND_VOICE,
} from '../lib/brandVoice';

interface BrandVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrandVoiceModal({ isOpen, onClose }: BrandVoiceModalProps) {
  const { brandVoice, setBrandVoice, save, refresh, clear, isFilled, error: saveError } = useBrandVoice();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Синхронизация данных при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      refresh();
      setConfirmDelete(false);
    }
  }, [isOpen, refresh]);

  // Сброс подтверждения удаления через 8 секунд бездействия
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => {
      setConfirmDelete(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  // Сброс скролла body при открытой модалке
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Автофокус на первом поле
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Очистка таймера уведомлений через 3 секунды
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof EMPTY_BRAND_VOICE, value: string) => {
    setBrandVoice({
      ...brandVoice,
      [field]: value,
    });
  };

  const handleSave = () => {
    save();
    refresh();
    if (saveError) {
      setNotification({ type: 'error', message: saveError });
    } else {
      setNotification({ type: 'success', message: '✓ Профиль сохранён' });
    }
  };

  const handleExport = () => {
    try {
      exportBrandVoice(brandVoice);
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Ошибка экспорта' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importBrandVoice(file);
      saveBrandVoice(imported);
      setBrandVoice(imported);
      refresh();
      setNotification({ type: 'success', message: '✓ Профиль успешно импортирован из файла и сохранён' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Не удалось прочитать файл JSON' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearConfirm = () => {
    clear();
    clearBrandVoice();
    setBrandVoice({ ...EMPTY_BRAND_VOICE });
    refresh();
    setConfirmDelete(false);
    setNotification({ type: 'success', message: 'Профиль компании полностью очищен' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-voice-modal-title"
      >
        {/* Шапка модалки */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="brand-voice-modal-title" className="text-lg font-bold text-[#102A43]">
                  Профиль компании
                </h2>
                {isFilled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    ✓ Профиль заполнен
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Профиль не заполнен
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Эти данные автоматически подмешиваются во все генерации для персонализации контента
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модалки с формой */}
        <div className="p-6 space-y-5 flex-1">
          {/* Уведомление */}
          {notification && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 p-3 rounded-lg text-sm transition-all ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Сетка полей формы */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* companyName */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Название компании <span className="text-rose-500">*</span>
              </label>
              <textarea
                ref={firstInputRef}
                rows={3}
                value={brandVoice.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="ООО Ромашка"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* industry */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Отрасль
              </label>
              <textarea
                rows={3}
                value={brandVoice.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                placeholder="Розничная торговля / IT / юруслуги"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* icp */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Идеальный клиент (ICP)
              </label>
              <textarea
                rows={3}
                value={brandVoice.icp}
                onChange={(e) => handleChange('icp', e.target.value)}
                placeholder="CTO и основатели SaaS-стартапов от 20 до 200 человек"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* painPoints */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Главные боли клиента
              </label>
              <textarea
                rows={3}
                value={brandVoice.painPoints}
                onChange={(e) => handleChange('painPoints', e.target.value)}
                placeholder="Утечка кода, штрафы, невыгодные контракты с субподрядчиками"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* uvp */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Уникальное предложение (УТП) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={brandVoice.uvp}
                onChange={(e) => handleChange('uvp', e.target.value)}
                placeholder="Защищаем IT-разработки без суда, за 2 недели"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* tone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tone of voice
              </label>
              <textarea
                rows={3}
                value={brandVoice.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                placeholder="Экспертный, без воды. Короткие предложения. С цифрами"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* bannedWords */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Запрещённые слова (через запятую)
              </label>
              <textarea
                rows={3}
                value={brandVoice.bannedWords}
                onChange={(e) => handleChange('bannedWords', e.target.value)}
                placeholder="инновационный, лидирующий, уникальный, синергия"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* goodExamples */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Примеры хорошего контента
              </label>
              <textarea
                rows={5}
                value={brandVoice.goodExamples}
                onChange={(e) => handleChange('goodExamples', e.target.value)}
                placeholder="Вставьте 2–3 абзаца текста, который вам нравится — мы будем на него ориентироваться"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>

            {/* extraNotes */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Дополнительные заметки
              </label>
              <textarea
                rows={5}
                value={brandVoice.extraNotes}
                onChange={(e) => handleChange('extraNotes', e.target.value)}
                placeholder="Любая другая информация, которая поможет персонализировать контент"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none resize-none"
              />
            </div>
          </div>

          {/* Скрытый input для импорта JSON */}
          <input
            type="file"
            accept=".json"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {/* Подвал с кнопками управления */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Сохранить профиль */}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить профиль</span>
            </button>

            {/* Экспорт JSON */}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 font-medium text-sm transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Экспорт JSON</span>
            </button>

            {/* Импорт JSON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 font-medium text-sm transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Импорт JSON</span>
            </button>
          </div>

          {/* Очистить */}
          {confirmDelete ? (
            <div className="inline-flex items-center gap-2 p-1.5 pl-3 bg-rose-50 border border-rose-200 rounded-xl shadow-xs animate-fadeIn">
              <span className="text-xs font-semibold text-rose-800">Точно очистить профиль?</span>
              <button
                type="button"
                onClick={handleClearConfirm}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
              >
                Да, очистить
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 font-medium text-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Очистить</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
