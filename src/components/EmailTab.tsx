import React, { useState, useEffect } from 'react';
import {
  Send,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Building2,
  User,
  Target,
  FileText,
  FileDown,
  Code,
} from 'lucide-react';
import { INDUSTRIES, INDUSTRY_PRESETS } from '../lib/presets';
import { MetaBadge } from './MetaBadge';
import { stripMarkdown } from '../lib/validate';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import type { EmailData } from '../types';

interface GeneratedEmailResponse {
  subject: string;
  preheader: string;
  greeting: string;
  body: string;
  cta: string;
  signature: string;
  missing_data?: string[];
  meta?: {
    context?: string;
    tone?: string;
    goal?: string;
  };
}

const INITIAL_FORM: EmailData = {
  industry: 'services',
  companyName: '',
  senderName: '',
  clientName: '',
  clientPosition: '',
  clientCompany: '',
  product: '',
  keyBenefit: '',
  keyNumber: '',
  businessGoal: 'Запись на консультацию',
  tone: 'Деловой',
};

const SAMPLE_DATA: EmailData = {
  industry: 'Юридические услуги для бизнеса',
  companyName: 'Правовой Щит',
  senderName: 'Анна Смирнова',
  clientName: 'Дмитрий',
  clientPosition: 'Генеральный директор',
  clientCompany: 'ООО Технопром',
  product: 'Абонентское юридическое обслуживание',
  keyBenefit: 'Снижение юридических рисков и экономия до 40% на содержании юристов',
  keyNumber: 'Экономия до 40%',
  businessGoal: 'Возврат клиента',
  tone: 'Деловой',
};

const GOAL_OPTIONS = [
  'Запись на консультацию',
  'Отправка КП',
  'Возврат клиента',
  'Вебинар',
  'Анонс услуги',
];

const TONE_OPTIONS = [
  'Деловой',
  'Дружеский',
  'Экспертный',
];

export function EmailTab() {
  const [brandVoice, setBrandVoice] = useState(() => getBrandVoice());
  const [formData, setFormData] = useState<EmailData>(() => {
    const bv = getBrandVoice();
    return {
      ...INITIAL_FORM,
      companyName: bv.companyName?.trim() || '',
      industry: bv.industry?.trim() || '',
    };
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedEmailResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showJson, setShowJson] = useState<boolean>(false);

  // Синхронизация названия компании при изменении профиля в реальном времени
  useEffect(() => {
    const syncBrandVoice = () => {
      const bv = getBrandVoice();
      setBrandVoice(bv);
      if (bv.companyName) {
        setFormData((prev) => {
          // Если поле компании пустое или совпадает со старым профилем
          if (!prev.companyName.trim()) {
            return {
              ...prev,
              companyName: bv.companyName,
              industry: prev.industry || bv.industry || '',
            };
          }
          return prev;
        });
      }
    };

    window.addEventListener('storage', syncBrandVoice);
    window.addEventListener('aicm:brand-voice-changed', syncBrandVoice);
    window.addEventListener('focus', syncBrandVoice);
    return () => {
      window.removeEventListener('storage', syncBrandVoice);
      window.removeEventListener('aicm:brand-voice-changed', syncBrandVoice);
      window.removeEventListener('focus', syncBrandVoice);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFillSample = () => {
    setFormData(SAMPLE_DATA);
    setError(null);
  };

  const handleReset = () => {
    const bv = getBrandVoice();
    setFormData({
      ...INITIAL_FORM,
      companyName: bv.companyName?.trim() || '',
      industry: bv.industry?.trim() || '',
    });
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.product.trim() || !formData.keyBenefit.trim()) {
      setError('Пожалуйста, укажите название вашей компании, услугу и ключевую выгоду.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка при генерации email-письма');
      }

      setResult(json.data as GeneratedEmailResponse);
    } catch (err: any) {
      setError(err?.message || 'Не удалось сгенерировать письмо. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (!result) return;
    const cleanSubject = stripMarkdown(result.subject);
    const cleanPreheader = stripMarkdown(result.preheader);
    const cleanGreeting = stripMarkdown(result.greeting);
    const cleanBody = stripMarkdown(result.body);
    const cleanCta = stripMarkdown(result.cta);
    const cleanSignature = stripMarkdown(result.signature);

    const fullText = `Тема: ${cleanSubject}\n\nПрехедер: ${cleanPreheader}\n\n${cleanGreeting}\n\n${cleanBody}\n\n${cleanCta}\n\n${cleanSignature}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedField('export-text');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const cleanSubject = stripMarkdown(result.subject);
    const cleanPreheader = stripMarkdown(result.preheader);
    const cleanGreeting = stripMarkdown(result.greeting);
    const cleanBody = stripMarkdown(result.body);
    const cleanCta = stripMarkdown(result.cta);
    const cleanSignature = stripMarkdown(result.signature);

    const content = `Тема: ${cleanSubject}\n\nПрехедер: ${cleanPreheader}\n\n${cleanGreeting}\n\n${cleanBody}\n\n${cleanCta}\n\n${cleanSignature}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-${Date.now()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    const cleanSubject = stripMarkdown(result.subject);
    const cleanPreheader = stripMarkdown(result.preheader);
    const cleanGreeting = stripMarkdown(result.greeting);
    const cleanBody = stripMarkdown(result.body)
      .split('\n\n')
      .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br />')}</p>`)
      .join('');
    const cleanCta = stripMarkdown(result.cta);
    const cleanSignature = stripMarkdown(result.signature).replace(/\n/g, '<br />');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanSubject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #102a43;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 12px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-style: italic;">
              ${cleanPreheader}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #102a43; font-weight: 600;">${cleanGreeting}</h2>
              <div style="font-size: 15px; color: #334155;">
                ${cleanBody}
              </div>
              ${
                cleanCta
                  ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0e9f9a;">
                    <a href="#" target="_blank" style="font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; background-color: #0e9f9a;">
                      ${cleanCta}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
                ${cleanSignature}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-${Date.now()}.html`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Левая колонка: форма ввода */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center font-bold">
              📧
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#102A43]">
                Генератор B2B-рассылок
              </h2>
              <p className="text-xs text-slate-400">Категория: ВОВЛЕЧЕНИЕ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="text-xs font-medium text-[#0E9F9A] hover:text-[#0c8a86] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Заполнить пример
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Пресеты по сферам бизнеса
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    industry: ind.id,
                    ...INDUSTRY_PRESETS[ind.id],
                  }));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  formData.industry === ind.id
                    ? 'bg-[#0E9F9A] text-white border-[#0E9F9A]'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <span>{ind.icon}</span>
                <span>{ind.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Секция: Отправитель */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-[#0E9F9A]" />
              Ваша компания и отправитель
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#102A43]">
                    Компания <span className="text-rose-500">*</span>
                  </label>
                  {brandVoice.companyName && formData.companyName !== brandVoice.companyName && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, companyName: brandVoice.companyName }))}
                      className="text-[11px] text-[#0E9F9A] hover:underline cursor-pointer"
                      title="Вставить название компании из профиля"
                    >
                      Из профиля ({brandVoice.companyName})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder={brandVoice.companyName || "Напр. Правовой Щит"}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Имя отправителя
                </label>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  placeholder="Напр. Анна Смирнова"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Сфера / Отрасль
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="Напр. Юридические услуги для бизнеса"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
              />
            </div>
          </div>

          {/* Секция: Клиент */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-[#0E9F9A]" />
              Получатель (клиент)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Имя клиента
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="Напр. Дмитрий"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Должность клиента
                </label>
                <input
                  type="text"
                  name="clientPosition"
                  value={formData.clientPosition}
                  onChange={handleChange}
                  placeholder="Напр. Ген. директор"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Компания клиента
                </label>
                <input
                  type="text"
                  name="clientCompany"
                  value={formData.clientCompany}
                  onChange={handleChange}
                  placeholder="Напр. ООО Технопром"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Секция: Предложение и выгода */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-[#0E9F9A]" />
              Предложение
            </div>
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Услуга / Продукт <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="product"
                value={formData.product}
                onChange={handleChange}
                placeholder="Напр. Абонентское юридическое обслуживание"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Ключевая выгода <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="keyBenefit"
                  rows={2}
                  value={formData.keyBenefit}
                  onChange={handleChange}
                  placeholder="Напр. Снижение рисков и экономия на штате юристов"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Ключевая цифра / метрика
                </label>
                <textarea
                  name="keyNumber"
                  rows={2}
                  value={formData.keyNumber}
                  onChange={handleChange}
                  placeholder="Напр. Экономия 40%, 15 дней, 300+ клиентов"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Секция: Цель и тон */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-[#0E9F9A]" />
              Бизнес-цель и тон письма
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Бизнес-цель
                </label>
                <select
                  name="businessGoal"
                  value={formData.businessGoal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent cursor-pointer"
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Тон
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent cursor-pointer"
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Генерация письма...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Сгенерировать письмо</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              title="Сбросить форму"
              className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Правая колонка: готовый результат */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F9A]"></span>
            <h3 className="text-base font-bold text-[#102A43]">Готовое email-письмо</h3>
          </div>
          {result && (
            <MetaBadge
              meta={
                result.meta || {
                  context: 'B2B',
                  tone: formData.tone,
                  goal: formData.businessGoal,
                }
              }
            />
          )}
        </div>

        {result ? (
          <div className="space-y-5">
            {/* Карточка в стиле почтового клиента */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              {/* Top bar (gray, rounded-top): 3 dots (red, amber, green) + "Входящие — {clientName}" */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-xs font-semibold text-slate-600 truncate max-w-[200px] sm:max-w-none">
                  Входящие — {formData.clientName ? formData.clientName : 'Клиент'}
                </div>
                <div className="w-12"></div>
              </div>

              {/* Header section (bg-slate-50/50) */}
              <div className="bg-slate-50/70 p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar: 40px circle, gradient from #102A43 to #0E9F9A, showing first 2 letters of company name */}
                  <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-[#102A43] to-[#0E9F9A] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {((formData.companyName || 'КО').trim().slice(0, 2)).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="font-bold text-[#102A43] truncate">
                      {formData.companyName || 'Компания'}{' '}
                      <span className="font-normal text-slate-400">&lt;contact@company.com&gt;</span>
                    </div>
                    <div className="text-slate-500 truncate">
                      Кому: {formData.clientName || 'Клиент'}
                      {formData.clientPosition ? ` (${formData.clientPosition})` : ''}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 font-medium">
                  Сегодня, {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Subject line: bold, larger, "📧 Тема:" + value */}
              <div className="px-5 pt-4 pb-2 border-b border-slate-100">
                <div className="text-base font-bold text-[#102A43]">
                  📧 Тема: <span className="text-[#0E9F9A]">{stripMarkdown(result.subject)}</span>
                </div>
                {/* Preheader line: gray, italic "Прехедер:" + value */}
                <div className="text-xs text-slate-500 italic mt-1">
                  Прехедер: {stripMarkdown(result.preheader)}
                </div>
              </div>

              {/* Body section: greeting + paragraphs + CTA button + signature */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="font-semibold text-sm text-[#102A43]">
                  {stripMarkdown(result.greeting)}
                </div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-3">
                  {stripMarkdown(result.body)}
                </div>
                {result.cta && (
                  <div className="pt-3 pb-2 text-center sm:text-left">
                    <span className="inline-block px-5 py-2.5 rounded-xl bg-[#0E9F9A] text-white font-medium text-sm shadow-xs cursor-default">
                      {stripMarkdown(result.cta)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
                  {stripMarkdown(result.signature)}
                </div>
              </div>

              {/* Bottom bar: businessGoal */}
              <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Бизнес-цель:{' '}
                  <strong className="text-[#102A43] font-semibold">
                    {formData.businessGoal || result.meta?.goal || 'Не указана'}
                  </strong>
                </span>
                <span className="text-[11px] text-slate-400">AI Контент-Мейкер · Email</span>
              </div>
            </div>

            {/* Export buttons: 3 buttons in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {copiedField === 'export-text' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Скопировать текст</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Скачать .txt</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#0E9F9A]" />
                <span>Скачать .html</span>
              </button>
            </div>

            {/* JSON toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#102A43] cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-slate-400" />
                <span>{showJson ? 'Скрыть JSON' : 'Показать JSON'}</span>
              </button>

              {showJson && (
                <pre className="mt-2.5 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl border border-dashed border-slate-200">
              ✉️
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Письмо ещё не сгенерировано</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Заполните поля формы слева или нажмите «Заполнить пример», затем нажмите кнопку «Сгенерировать письмо».
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailTab;
