import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  FileDown,
  Code,
} from 'lucide-react';
import { stripMarkdown } from '../lib/validate';
import { MetaBadge } from './MetaBadge';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import type { ProposalData } from '../types';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM: ProposalData = {
  companyName: '',
  clientCompany: '',
  clientName: '',
  clientPosition: '',
  service: '',
  problem: '',
  solution: '',
  scope: '',
  pricing: '',
  timeline: '',
  terms: '',
  contact: '',
};

const SAMPLE_PROPOSAL: ProposalData = {
  companyName: 'Автоматизация БП',
  clientCompany: 'Ромашка',
  clientName: 'Дмитрий',
  clientPosition: 'Финансовый директор',
  service: 'Автоматизация финансовой отчётности',
  problem: 'Ручная сверка данных 40 часов в месяц',
  solution: 'Интеграция 1С с BI-системой, настройка дашбордов',
  scope: 'Интеграция 1С\nНастройка дашбордов\nОбучение команды',
  pricing: 'от 250 000 руб.',
  timeline: '4–6 недель',
  terms: 'Оплата 50/50, гарантия 6 месяцев',
  contact: 'ivan@company.ru, +7 999 123-45-67',
};

const REQUIRED_LABELS: Record<string, string> = {
  companyName: 'Название вашей компании',
  clientCompany: 'Клиент — название компании',
  clientName: 'Имя контактного лица',
  service: 'Услуга',
  problem: 'Проблема клиента',
  solution: 'Решение',
  scope: 'Что входит',
  pricing: 'Стоимость',
  contact: 'Контакт для связи',
};

export function ProposalModal({ isOpen, onClose }: ProposalModalProps) {
  const [brandVoice, setBrandVoice] = useState(() => getBrandVoice());
  const [formData, setFormData] = useState<ProposalData>(() => {
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
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  // Реф для автофокуса на первом инпуте (Task 5)
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация профиля при открытии модального окна и событиях
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

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

  // Сброс формы и закрытие (Task 2)
  const handleClose = () => {
    const bv = getBrandVoice();
    setFormData({
      ...INITIAL_FORM,
      companyName: bv.companyName?.trim() || '',
    });
    setResult(null);
    setError(null);
    setMissingFields([]);
    setShowJson(false);
    onClose();
  };

  // Предотвращение скролла фона при открытом модальном окне (Task 3)
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

  // Закрытие по клавише Escape (Task 4)
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Автофокус на первом поле ввода при открытии модального окна (Task 5)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (missingFields.includes(name)) {
      setMissingFields((prev) => prev.filter((f) => f !== name));
    }
  };

  const handleFillSample = () => {
    setFormData(SAMPLE_PROPOSAL);
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация обязательных полей
    const missing: string[] = [];
    if (!formData.companyName.trim()) missing.push('companyName');
    if (!formData.clientCompany.trim()) missing.push('clientCompany');
    if (!formData.clientName.trim()) missing.push('clientName');
    if (!formData.service.trim()) missing.push('service');
    if (!formData.problem.trim()) missing.push('problem');
    if (!formData.solution.trim()) missing.push('solution');
    if (!formData.scope.trim()) missing.push('scope');
    if (!formData.pricing.trim()) missing.push('pricing');
    if (!formData.contact.trim()) missing.push('contact');

    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }

    setMissingFields([]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка при генерации коммерческого предложения');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Не удалось сгенерировать КП. Попробуйте ещё раз.');
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
    if (result.about) {
      lines.push('О КОМПАНИИ');
      lines.push(stripMarkdown(result.about));
      lines.push('');
    }
    if (result.problem) {
      lines.push('ПРОБЛЕМА');
      lines.push(stripMarkdown(result.problem));
      lines.push('');
    }
    if (result.solution) {
      lines.push('РЕШЕНИЕ');
      lines.push(stripMarkdown(result.solution));
      lines.push('');
    }
    if (result.scope) {
      lines.push('ЧТО ВХОДИТ');
      const scopeArr = Array.isArray(result.scope) ? result.scope : [result.scope];
      scopeArr.forEach((item: string) => {
        lines.push(`• ${stripMarkdown(item)}`);
      });
      lines.push('');
    }
    if (result.pricing) {
      lines.push('СТОИМОСТЬ');
      lines.push(stripMarkdown(result.pricing));
      lines.push('');
    }
    if (result.timeline) {
      lines.push('СРОКИ');
      lines.push(stripMarkdown(result.timeline));
      lines.push('');
    }
    if (result.terms) {
      lines.push('УСЛОВИЯ');
      lines.push(stripMarkdown(result.terms));
      lines.push('');
    }
    if (result.cta) {
      lines.push('КОНТАКТЫ И СЛЕДУЮЩИЙ ШАГ');
      lines.push(stripMarkdown(result.cta));
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
    const clientName = (formData.clientCompany || formData.clientName || 'client')
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    link.download = `proposal-${clientName}-${Date.now()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Экспорт в формате печатного бизнес-документа (Task 1)
  const handleDownloadHtml = () => {
    if (!result) return;
    const cleanTitle = stripMarkdown(result.title || 'Коммерческое предложение');
    const cleanAbout = stripMarkdown(result.about || '');
    const cleanProblem = stripMarkdown(result.problem || '');
    const cleanSolution = stripMarkdown(result.solution || '');
    const scopeArr = Array.isArray(result.scope) ? result.scope : (result.scope ? [result.scope] : []);
    const cleanPricing = stripMarkdown(result.pricing || '');
    const cleanTimeline = stripMarkdown(result.timeline || '');
    const cleanTerms = stripMarkdown(result.terms || '');
    const cleanCta = stripMarkdown(result.cta || '');

    const scopeHtml = scopeArr.map((item: string) => `<li>${stripMarkdown(item)}</li>`).join('');

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${cleanTitle}</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; 
           max-width: 800px; margin: 40px auto; padding: 20px; 
           color: #102A43; line-height: 1.6; }
    h1 { color: #102A43; font-size: 24px; margin-bottom: 24px; }
    h2 { color: #0E9F9A; font-size: 14px; text-transform: uppercase; 
         letter-spacing: 0.05em; margin-top: 28px; margin-bottom: 8px; }
    p { margin: 8px 0; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    .highlight { background: #f0fdfa; padding: 12px 16px; 
                 border-radius: 8px; border-left: 3px solid #0E9F9A; 
                 margin: 16px 0; }
  </style>
</head>
<body>
  <h1>${cleanTitle}</h1>
  ${cleanAbout ? `<h2>О компании</h2><p>${cleanAbout}</p>` : ''}
  ${cleanProblem ? `<h2>Проблема</h2><p>${cleanProblem}</p>` : ''}
  ${cleanSolution ? `<h2>Решение</h2><p>${cleanSolution}</p>` : ''}
  ${scopeArr.length > 0 ? `<h2>Что входит</h2><ul>${scopeHtml}</ul>` : ''}
  ${cleanPricing ? `<div class="highlight"><h2>Стоимость</h2><p>${cleanPricing}</p></div>` : ''}
  ${cleanTimeline ? `<h2>Сроки</h2><p>${cleanTimeline}</p>` : ''}
  ${cleanTerms ? `<h2>Условия</h2><p>${cleanTerms}</p>` : ''}
  ${cleanCta ? `<h2>Следующий шаг</h2><p>${cleanCta}</p>` : ''}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const clientName = (formData.clientCompany || formData.clientName || 'client')
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    link.download = `proposal-${clientName}-${Date.now()}.html`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
      >
        {/* Шапка модального окна */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 bg-white/95 backdrop-blur-xs border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center font-bold text-sm">
              📄
            </div>
            <h2
              id="proposal-modal-title"
              className="text-base sm:text-lg font-bold text-[#102A43]"
            >
              Создать коммерческое предложение
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFillSample}
              className="hidden sm:flex text-xs font-medium text-[#0E9F9A] hover:text-[#0c8a86] hover:underline items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Пример
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="hidden sm:inline text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Сброс
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Контент модального окна */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Ошибка */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Валидация обязательных полей */}
          {missingFields.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Не заполнены обязательные поля:</span>
              </div>
              <ul className="list-disc list-inside text-amber-700 space-y-0.5 pl-1">
                {missingFields.map((field) => (
                  <li key={field}>{REQUIRED_LABELS[field] || field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Форма ввода */}
          <form onSubmit={handleGenerate} noValidate className="space-y-4">
            {/* Компания и Клиент */}
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
                  ref={firstInputRef}
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
                  name="clientCompany"
                  value={formData.clientCompany}
                  onChange={handleChange}
                  placeholder="Например: Ромашка"
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                    missingFields.includes('clientCompany')
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Контактное лицо и Должность */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Имя контактного лица <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="Например: Дмитрий"
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                    missingFields.includes('clientName')
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Должность контактного лица{' '}
                  <span className="text-slate-400 text-[11px] font-normal">(опционально)</span>
                </label>
                <input
                  type="text"
                  name="clientPosition"
                  value={formData.clientPosition || ''}
                  onChange={handleChange}
                  placeholder="Например: Финансовый директор"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
            </div>

            {/* Услуга */}
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Услуга <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="service"
                value={formData.service}
                onChange={handleChange}
                placeholder="Например: Автоматизация финансовой отчётности"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                  missingFields.includes('service')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                  }`}
              />
            </div>

            {/* Проблема и Решение */}
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Проблема клиента <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="problem"
                rows={2}
                value={formData.problem}
                onChange={handleChange}
                placeholder="Какую боль или сложность решает предложение"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y ${
                  missingFields.includes('problem')
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
                rows={2}
                value={formData.solution}
                onChange={handleChange}
                placeholder="Как именно вы решите проблему клиента"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y ${
                  missingFields.includes('solution')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>

            {/* Что входит */}
            <div>
              <label className="block text-xs font-medium text-[#102A43] mb-1">
                Что входит <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="scope"
                rows={3}
                value={formData.scope}
                onChange={handleChange}
                placeholder="Каждый пункт с новой строки"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent resize-y ${
                  missingFields.includes('scope')
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
            </div>

            {/* Стоимость и Сроки */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Стоимость <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="pricing"
                  value={formData.pricing}
                  onChange={handleChange}
                  placeholder="Например: от 250 000 руб."
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                    missingFields.includes('pricing')
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Сроки <span className="text-slate-400 text-[11px] font-normal">(опционально)</span>
                </label>
                <input
                  type="text"
                  name="timeline"
                  value={formData.timeline || ''}
                  onChange={handleChange}
                  placeholder="Например: 4–6 недель"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>
            </div>

            {/* Условия и Контакт для связи */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Условия <span className="text-slate-400 text-[11px] font-normal">(опционально)</span>
                </label>
                <input
                  type="text"
                  name="terms"
                  value={formData.terms || ''}
                  onChange={handleChange}
                  placeholder="Например: Оплата 50/50, гарантия 6 месяцев"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#102A43] mb-1">
                  Контакт для связи <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Например: ivan@company.ru, +7 999 123-45-67"
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent ${
                    missingFields.includes('contact')
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Кнопка отправки */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#0E9F9A] text-white rounded-xl px-5 py-2.5 font-medium text-sm hover:bg-[#0c8a86] active:bg-[#0a7572] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Генерация КП...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>✨ Сгенерировать КП</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Missing data warning от модели */}
          {result?.missing_data && result.missing_data.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Недостаточно данных для полного КП:</span>
              </div>
              <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
                {result.missing_data.map((item: string, i: number) => (
                  <li key={i}>{stripMarkdown(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Результат генерации КП */}
          {result && (!result.missing_data || result.missing_data.length === 0) && (
            <div className="bg-slate-50/60 rounded-xl border border-slate-200 p-5 sm:p-6 space-y-5 animate-fadeIn">
              {/* MetaBadge */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                <MetaBadge
                  meta={{
                    context: result.meta?.context || 'B2B',
                    industry: result.meta?.service || formData.service,
                    goal: result.meta?.client || formData.clientCompany,
                  }}
                />
                <span className="text-xs text-slate-400 font-medium">Готовое КП</span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-[#102A43] leading-snug">
                {stripMarkdown(result.title)}
              </h3>

              {/* Sections */}
              <div className="space-y-4">
                {/* О компании */}
                {result.about && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      О компании
                    </h4>
                    <p className="text-sm leading-relaxed text-[#102A43]">
                      {stripMarkdown(result.about)}
                    </p>
                  </div>
                )}

                {/* Проблема */}
                {result.problem && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Проблема
                    </h4>
                    <p className="text-sm leading-relaxed text-[#102A43]">
                      {stripMarkdown(result.problem)}
                    </p>
                  </div>
                )}

                {/* Решение */}
                {result.solution && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Решение
                    </h4>
                    <div className="space-y-2">
                      {stripMarkdown(result.solution)
                        .split(/\n\s*\n/)
                        .map((p: string, idx: number) => (
                          <p key={idx} className="text-sm leading-relaxed text-[#102A43]">
                            {p.trim()}
                          </p>
                        ))}
                    </div>
                  </div>
                )}

                {/* Что входит */}
                {result.scope && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Что входит
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed text-[#102A43]">
                      {(Array.isArray(result.scope) ? result.scope : [result.scope]).map(
                        (item: string, idx: number) => (
                          <li key={idx} className="pl-1">
                            {stripMarkdown(item)}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Стоимость и Сроки */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {result.pricing && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Стоимость
                      </div>
                      <div className="text-base font-bold text-[#0E9F9A]">
                        {stripMarkdown(result.pricing)}
                      </div>
                    </div>
                  )}

                  {result.timeline && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Сроки
                      </div>
                      <div className="text-base font-semibold text-[#102A43]">
                        {stripMarkdown(result.timeline)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Условия */}
                {result.terms && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Условия
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {stripMarkdown(result.terms)}
                    </p>
                  </div>
                )}

                {/* CTA */}
                {result.cta && (
                  <div className="p-3.5 bg-[#0E9F9A]/10 border-l-4 border-[#0E9F9A] rounded-r-lg">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E9F9A] mb-1">
                      Следующий шаг
                    </h4>
                    <p className="text-sm font-medium text-[#102A43]">
                      {stripMarkdown(result.cta)}
                    </p>
                  </div>
                )}
              </div>

              {/* Экспорт и действия */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>📋 Скопировать</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>💾 .txt</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>💾 .html</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowJson(!showJson)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-slate-500" />
                  <span>{showJson ? '📄 Скрыть JSON' : '📄 JSON'}</span>
                </button>
              </div>

              {/* JSON preview */}
              {showJson && (
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-72 leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
