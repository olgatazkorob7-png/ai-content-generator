import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  FileDown,
  Code,
} from 'lucide-react';
import { INDUSTRIES } from '../lib/presets';
import { stripMarkdown } from '../lib/validate';
import { MetaBadge } from './MetaBadge';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import type { CaseData } from '../types';

const INITIAL_FORM: CaseData = {
  industry: 'services',
  companyName: '',
  clientName: '',
  clientIndustry: '',
  challenge: '',
  solution: '',
  results: '',
  duration: '',
  quote: '',
  targetAudience: '',
};

const SAMPLE_CASE: CaseData = {
  industry: 'it',
  companyName: 'Автоматизация БП',
  clientName: 'Ромашка',
  clientIndustry: 'Розничная торговля',
  challenge: 'Финансовый отдел тратил 40 часов в месяц на ручную сверку данных',
  solution: 'Внедрили интеграцию 1С с BI-системой и настроили дашборды',
  results: 'Экономия 40 часов в месяц, снижение ошибок на 35%',
  duration: '3 месяца',
  quote: 'Впервые за год финдир уходит домой вовремя',
  targetAudience: 'Финансовые директора',
};

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  companyName: 'Название вашей компании',
  clientName: 'Клиент — название компании',
  clientIndustry: 'Отрасль клиента',
  challenge: 'Проблема клиента',
  solution: 'Решение',
  results: 'Результат в цифрах',
  targetAudience: 'Целевая аудитория кейса',
};

export function CaseTab() {
  const [brandVoice, setBrandVoice] = useState(() => getBrandVoice());
  const [formData, setFormData] = useState<CaseData>(() => {
    const bv = getBrandVoice();
    return {
      ...INITIAL_FORM,
      companyName: bv.companyName?.trim() || '',
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Синхронизация названия компании при изменении профиля в реальном времени
  useEffect(() => {
    const syncBrandVoice = () => {
      const bv = getBrandVoice();
      setBrandVoice(bv);
      if (bv.companyName) {
        setFormData((prev) => {
          if (!prev.companyName.trim()) {
            return {
              ...prev,
              companyName: bv.companyName,
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (missingFields.includes(name)) {
      setMissingFields((prev) => prev.filter((field) => field !== name));
    }
  };

  const handleFillSample = () => {
    setFormData(SAMPLE_CASE);
    setError(null);
    setMissingFields([]);
  };

  const handleReset = () => {
    const bv = getBrandVoice();
    setFormData({
      ...INITIAL_FORM,
      companyName: bv.companyName?.trim() || '',
    });
    setError(null);
    setResult(null);
    setMissingFields([]);
    setShowJson(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация обязательных полей
    const missing: string[] = [];
    if (!formData.companyName.trim()) missing.push('companyName');
    if (!formData.clientName.trim()) missing.push('clientName');
    if (!formData.clientIndustry.trim()) missing.push('clientIndustry');
    if (!formData.challenge.trim()) missing.push('challenge');
    if (!formData.solution.trim()) missing.push('solution');
    if (!formData.results.trim()) missing.push('results');
    if (!formData.targetAudience.trim()) missing.push('targetAudience');

    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }

    setMissingFields([]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка при генерации клиентского кейса');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Не удалось сгенерировать кейс. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const getPlainText = () => {
    if (!result) return '';
    const lines: string[] = [];
    if (result.title) {
      lines.push(stripMarkdown(result.title));
      lines.push('');
    }
    if (result.client_info) {
      lines.push('О КЛИЕНТЕ');
      lines.push(stripMarkdown(result.client_info));
      lines.push('');
    }
    if (result.challenge) {
      lines.push('ЗАДАЧА');
      lines.push(stripMarkdown(result.challenge));
      lines.push('');
    }
    if (result.solution) {
      lines.push('РЕШЕНИЕ');
      lines.push(stripMarkdown(result.solution));
      lines.push('');
    }
    if (result.results) {
      lines.push('РЕЗУЛЬТАТЫ');
      const resultsArr = Array.isArray(result.results)
        ? result.results
        : [result.results];
      resultsArr.forEach((item: string) => {
        lines.push(`• ${stripMarkdown(item)}`);
      });
      lines.push('');
    }
    if (result.quote) {
      lines.push('ЦИТАТА КЛИЕНТА');
      lines.push(`«${stripMarkdown(result.quote)}»`);
      lines.push('');
    }
    if (result.summary) {
      lines.push('ИТОГ');
      lines.push(stripMarkdown(result.summary));
    }
    return lines.join('\n').trim();
  };

  const handleCopyText = async () => {
    const text = getPlainText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownloadTxt = () => {
    const text = getPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = (result.title ? stripMarkdown(result.title).slice(0, 30).trim() : 'case')
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    link.download = `${baseName || 'case'}-${Date.now()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Контейнер формы */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        {/* Шапка формы */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#102A43]">
                Генератор B2B-кейсов
              </h2>
              <p className="text-xs text-slate-400">Категория: ДОВЕРИЕ</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-medium text-[#0E9F9A] hover:text-[#0c8a86] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Заполнить пример
            </button>
          </div>
        </div>

        {/* Ошибка отправки / сервера */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Предупреждение о незаполненных обязательных полях (клиентская валидация) */}
        {missingFields.length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Не заполнены обязательные поля:</span>
            </div>
            <ul className="list-disc list-inside text-amber-700 space-y-0.5 pl-1">
              {missingFields.map((field) => (
                <li key={field}>{REQUIRED_FIELD_LABELS[field] || field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* SECTION 1: Industry presets */}
        <div className="mb-6">
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
                  }));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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

        {/* SECTION 2: Form fields */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* О вашей компании и клиенте */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#102A43]">
                  Название вашей компании <span className="text-rose-500">*</span>
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
                placeholder={brandVoice.companyName || "Например: Автоматизация БП"}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                  missingFields.includes('companyName')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Клиент — название компании <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Например: Ромашка"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                  missingFields.includes('clientName')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Отрасль клиента <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="clientIndustry"
                value={formData.clientIndustry}
                onChange={handleChange}
                placeholder="Например: Розничная торговля"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                  missingFields.includes('clientIndustry')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Целевая аудитория кейса <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder="Например: Финансовые директора"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                  missingFields.includes('targetAudience')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Проблема и Решение */}
          <div>
            <label className="block text-xs font-medium text-[#102A43] mb-1">
              Проблема клиента <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="challenge"
              rows={3}
              value={formData.challenge}
              onChange={handleChange}
              placeholder="Что было до проекта"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y ${
                missingFields.includes('challenge')
                  ? 'border-amber-400 bg-amber-50/30'
                  : 'border-slate-200'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#102A43] mb-1">
              Решение <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="solution"
              rows={3}
              value={formData.solution}
              onChange={handleChange}
              placeholder="Что вы сделали"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y ${
                missingFields.includes('solution')
                  ? 'border-amber-400 bg-amber-50/30'
                  : 'border-slate-200'
              }`}
            />
          </div>

          {/* Результат в цифрах */}
          <div>
            <label className="block text-xs font-medium text-[#102A43] mb-1">
              Результат в цифрах <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="results"
              value={formData.results}
              onChange={handleChange}
              placeholder="Например: экономия 40 часов, -35% ошибок"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                missingFields.includes('results')
                  ? 'border-amber-400 bg-amber-50/30'
                  : 'border-slate-200'
              }`}
            />
          </div>

          {/* Дополнительные (Optional) поля */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Дополнительно (опционально)
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Срок проекта <span className="text-slate-400 text-[11px] font-normal">(опционально)</span>
                </label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration || ''}
                  onChange={handleChange}
                  placeholder="Например: 3 месяца"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Цитата клиента <span className="text-slate-400 text-[11px] font-normal">(опционально)</span>
                </label>
                <textarea
                  name="quote"
                  rows={2}
                  value={formData.quote || ''}
                  onChange={handleChange}
                  placeholder="Например: Впервые за год финдир уходит домой вовремя"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y"
                />
              </div>
            </div>
          </div>

          {/* Кнопка отправки */}
          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-[#0E9F9A] text-white rounded-xl px-5 py-2.5 font-medium text-sm hover:bg-[#0c8a86] active:bg-[#0a7572] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Генерация кейса...</span>
                </>
              ) : (
                <>
                  <span>📊</span>
                  <span>Сгенерировать кейс</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: MissingDataAlert handling (от модели) */}
      {result?.missing_data && result.missing_data.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                Для генерации полноценного кейса не хватило следующих данных:
              </h3>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                {result.missing_data.map((item: string, i: number) => (
                  <li key={i}>{stripMarkdown(item)}</li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Дозаполнить форму
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 & 5: Отображение готового кейса */}
      {result && (!result.missing_data || result.missing_data.length === 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          {/* 1. MetaBadge above result */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <MetaBadge
              meta={{
                context: result.meta?.context || 'B2B',
                industry: result.meta?.industry || formData.clientIndustry,
              }}
            />
            <span className="text-xs text-slate-400 font-medium">Готовый кейс</span>
          </div>

          {/* 2. Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-[#102A43] leading-snug">
            {stripMarkdown(result.title)}
          </h2>

          {/* 3. Sections */}
          <div className="space-y-5">
            {/* О клиенте */}
            {result.client_info && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  О клиенте
                </h3>
                <p className="text-sm leading-relaxed text-[#102A43]">
                  {stripMarkdown(result.client_info)}
                </p>
              </div>
            )}

            {/* Задача */}
            {result.challenge && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Задача
                </h3>
                <p className="text-sm leading-relaxed text-[#102A43]">
                  {stripMarkdown(result.challenge)}
                </p>
              </div>
            )}

            {/* Решение */}
            {result.solution && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Решение
                </h3>
                <div className="space-y-2">
                  {stripMarkdown(result.solution)
                    .split(/\n\s*\n/)
                    .map((paragraph: string, idx: number) => (
                      <p key={idx} className="text-sm leading-relaxed text-[#102A43]">
                        {paragraph.trim()}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {/* Результаты */}
            {result.results && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Результаты
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed text-[#102A43]">
                  {(Array.isArray(result.results) ? result.results : [result.results]).map(
                    (item: string, idx: number) => (
                      <li key={idx} className="pl-1">
                        {stripMarkdown(item)}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Цитата клиента */}
            {result.quote && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Цитата клиента
                </h3>
                <blockquote className="border-l-4 border-[#0E9F9A] pl-4 py-2 italic text-slate-700 text-sm leading-relaxed bg-slate-50/70 rounded-r-lg">
                  «{stripMarkdown(result.quote)}»
                </blockquote>
              </div>
            )}

            {/* Итог */}
            {result.summary && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Итог
                </h3>
                <p className="text-sm leading-relaxed text-[#102A43]">
                  {stripMarkdown(result.summary)}
                </p>
              </div>
            )}
          </div>

          {/* EXPORT BUTTONS */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2.5">
            {/* 1. Скопировать текст */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>📋 Скопировать текст</span>
                </>
              )}
            </button>

            {/* 2. Скачать .txt */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>💾 Скачать .txt</span>
            </button>

            {/* 3. Показать JSON */}
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <span>{showJson ? '📄 Скрыть JSON' : '📄 Показать JSON'}</span>
            </button>
          </div>

          {/* Сырой JSON */}
          {showJson && (
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
