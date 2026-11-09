import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Copy,
  Check,
  Sparkles,
  Calendar,
  Clock,
  Download,
  History,
  Trash2,
  FolderOpen,
  X,
  Send,
} from 'lucide-react';
import { PublishButton } from './PublishButton';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import {
  listPlans,
  savePlan,
  deletePlan,
  getPlan,
  clearAllPlans,
  markPostPublished,
  getPostDate,
  isToday,
  formatDate,
} from '../lib/contentPlanStorage';
import type {
  ContentPlanRequest,
  ContentPlanResponse,
  ContentPlanPost,
  ContentPlanPostType,
  SavedPlan,
} from '../types';

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExportCSV(data: ContentPlanResponse) {
  const headers = ['День', 'Дата', 'Время', 'Тип', 'Заголовок', 'Текст', 'Хэштеги', 'CTA'];
  const rows = data.posts.map((post) => {
    const day = String(post.day);
    const date = post.date_hint || '';
    const time = post.time_hint || '';
    const type = post.content_type || '';
    const title = post.title || '';
    const text = post.body || '';
    const tags = post.hashtags
      ? post.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      : '';
    const cta = post.cta || '';

    return [day, date, time, type, title, text, tags, cta].map((val) => {
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(';');
  });

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(';'), ...rows].join('\r\n');
  downloadBlob(csvContent, 'content-plan.csv', 'text/csv;charset=utf-8');
}

function handleExportMarkdown(data: ContentPlanResponse) {
  const parts: string[] = [];
  parts.push(`# ${data.plan_title}\n`);

  data.posts.forEach((post) => {
    const dateTime = [post.date_hint, post.time_hint].filter(Boolean).join(', ');
    const headerTitle = dateTime ? `День ${post.day} — ${dateTime}` : `День ${post.day}`;
    const tags = post.hashtags
      ? post.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      : '';

    parts.push(`## ${headerTitle}\n`);
    parts.push(`**Тип:** ${post.content_type}\n`);
    parts.push(`### ${post.title}\n`);
    parts.push(`${post.body}\n`);
    if (tags) {
      parts.push(`**Хэштеги:** ${tags}\n`);
    }
    if (post.cta) {
      parts.push(`**CTA:** ${post.cta}\n`);
    }
    parts.push('---\n');
  });

  const mdContent = parts.join('\n');
  downloadBlob(mdContent, 'content-plan.md', 'text/markdown;charset=utf-8');
}

function handleExportJSON(data: ContentPlanResponse) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadBlob(jsonContent, 'content-plan.json', 'application/json;charset=utf-8');
}

const INITIAL_FORM: ContentPlanRequest = {
  topic: 'Защита IT-разработок',
  days: 7,
  postsPerDay: 1,
  tone: 'деловой',
  audience: 'CTO и основатели SaaS',
  goal: 'экспертность',
};

const TYPE_CONFIG: Record<
  ContentPlanPostType,
  { label: string; badgeClass: string }
> = {
  case: {
    label: 'кейс',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  insight: {
    label: 'инсайт',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  question: {
    label: 'вопрос',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  poll: {
    label: 'опрос',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  announcement: {
    label: 'анонс',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  story: {
    label: 'история',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function ContentPlanTab() {
  const [formData, setFormData] = useState<ContentPlanRequest>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentPlanResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => listPlans());
  const [showHistory, setShowHistory] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<{ id: string; title: string } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [publishingToday, setPublishingToday] = useState(false);

  useEffect(() => {
    const handler = () => setSavedPlans(listPlans());
    window.addEventListener('aicm:plan-updated', handler);
    return () => window.removeEventListener('aicm:plan-updated', handler);
  }, []);

  const currentPlan = (currentPlanId 
    ? savedPlans.find((p) => String(p.id) === String(currentPlanId)) 
    : null) || (result && savedPlans.length > 0 ? savedPlans[0] : null);

  const todayPosts = currentPlan 
    ? currentPlan.posts
        .map((p, idx) => ({ post: p, index: idx }))
        .filter(({ post }) => 
          isToday(getPostDate(currentPlan.createdAt, post.day))
        )
        .filter(({ index }) => 
          !(currentPlan.publishedPosts || []).includes(index)
        )
    : [];

  const handlePublishToday = async () => {
    if (!currentPlan || todayPosts.length === 0) return;
    
    const confirmed = window.confirm(
      `Опубликовать ${todayPosts.length} постов? Это действие нельзя отменить.`
    );
    if (!confirmed) return;
    
    setPublishingToday(true);
    const results: string[] = [];
    
    for (const { post, index } of todayPosts) {
      try {
        const text = [
          post.title,
          '',
          post.body,
          '',
          (post.hashtags || []).map((t: string) => 
            t.startsWith('#') ? t : '#' + t
          ).join(' '), 
          '',
          post.cta,
        ].filter(Boolean).join('\n').trim();
        
        const res = await fetch('/api/publish/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            data: post, 
            customText: text,
          }),
        });
        const json = await res.json();
        
        if (json.success) {
          markPostPublished(currentPlan.id, index);
          results.push(`✓ ${post.title.slice(0, 30)}...`);
        } else {
          results.push(`✗ ${post.title.slice(0, 30)}...: ${json.error}`);
        }
        
        // пауза 1.5 сек между постами, чтобы не словить rate limit
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e: any) {
        results.push(`✗ Ошибка: ${e.message}`);
      }
    }
    
    setSavedPlans(listPlans());
    setPublishingToday(false);
    
    alert('Готово:\n\n' + results.join('\n'));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'days' || name === 'postsPerDay' ? Number(value) : value,
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      setError('Укажите тему или нишу');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Ошибка при генерации контент-плана');
      }

      setResult(json.data);

      const newPlan: SavedPlan = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        plan_title: json.data.plan_title,
        posts: json.data.posts,
        request: formData,
        publishedPosts: [],
      };
      savePlan(newPlan);
      setSavedPlans(listPlans());
      setCurrentPlanId(newPlan.id);
    } catch (err: any) {
      setError(err?.message || 'Не удалось сгенерировать контент-план');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPost = async (post: ContentPlanPost, index: number) => {
    const tags = post.hashtags
      ? post.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      : '';
    const textToCopy = `${post.title}\n\n${post.body}\n\n${tags}\n\n${post.cta}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const confirmDeletePlan = (id: string) => {
    deletePlan(id);
    setSavedPlans(listPlans());
    if (currentPlanId === id) {
      setCurrentPlanId(null);
    }
    setPlanToDelete(null);
  };

  const handleClearAllHistory = () => {
    clearAllPlans();
    setSavedPlans([]);
    setCurrentPlanId(null);
    setConfirmClearAll(false);
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* ПАНЕЛЬ НАД ФОРМОЙ */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Контент-план</h2>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          История ({savedPlans.length})
        </button>
      </div>

      {/* ФОРМА */}
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Тема / ниша */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Тема / ниша
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="Защита IT-разработок"
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none"
              required
            />
          </div>

          {/* Дней (3–30) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Дней (3–30)
            </label>
            <input
              type="number"
              name="days"
              min={3}
              max={30}
              value={formData.days}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none"
              required
            />
          </div>

          {/* Постов в день (1–3) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Постов в день (1–3)
            </label>
            <input
              type="number"
              name="postsPerDay"
              min={1}
              max={3}
              value={formData.postsPerDay}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none"
              required
            />
          </div>

          {/* Тональность */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Тональность
            </label>
            <input
              type="text"
              name="tone"
              value={formData.tone}
              onChange={handleChange}
              placeholder="деловой"
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none"
            />
          </div>

          {/* Целевая аудитория */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Целевая аудитория
            </label>
            <input
              type="text"
              name="audience"
              value={formData.audience}
              onChange={handleChange}
              placeholder="CTO и основатели SaaS"
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none"
            />
          </div>

          {/* Бизнес-цель */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Бизнес-цель
            </label>
            <select
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E9F9A] outline-none bg-white"
            >
              <option value="прогрев">прогрев</option>
              <option value="экспертность">экспертность</option>
              <option value="продажа">продажа</option>
            </select>
          </div>
        </div>

        {/* Кнопка отправки формы */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Генерация плана...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Сгенерировать план</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ОШИБКА */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* РЕЗУЛЬТАТ */}
      {result && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
          {/* Панель заголовка и выгрузки */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0E9F9A]">
                Контент-план
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-1">
                {result.plan_title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV(result)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                title="Скачать таблицу CSV для Excel"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={() => handleExportMarkdown(result)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                title="Скачать контент-план в формате Markdown"
              >
                <Download className="w-3.5 h-3.5" /> Markdown
              </button>
              <button
                type="button"
                onClick={() => handleExportJSON(result)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                title="Скачать весь объект ответа в формате JSON"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          </div>

          {/* Панель публикации за сегодня */}
          {currentPlan && (
            todayPosts.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-950">
                  <Calendar className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Сегодня:</strong> {todayPosts.length}{' '}
                    {todayPosts.length === 1 ? 'пост' : 'постов'} к публикации
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePublishToday}
                  disabled={todayPosts.length === 0 || publishingToday}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0 w-full sm:w-auto transition-colors"
                  style={{ backgroundColor: '#059669', color: '#ffffff' }}
                >
                  {publishingToday && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />}
                  {!publishingToday && <Send className="w-3.5 h-3.5 shrink-0 text-white" />}
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>
                    {publishingToday ? 'Публикую...' : 'Опубликовать всё за сегодня'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                На сегодня постов нет
              </div>
            )
          )}

          {/* Список карточек по дням */}
          <div className="space-y-4">
            {result.posts.map((post, idx) => {
              const typeCfg = TYPE_CONFIG[post.content_type] || {
                label: post.content_type,
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
              };

              const isPublished = currentPlanId
                ? (savedPlans.find((p) => String(p.id) === String(currentPlanId))?.publishedPosts || [])
                    .includes(idx)
                : false;

              return (
                <div
                  key={`${post.day}-${idx}`}
                  className="rounded-xl border border-slate-200 p-5 space-y-3 bg-white hover:border-slate-300 transition-colors"
                >
                  {/* Верхняя строка карточки */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        День {post.day}
                      </span>
                      {currentPlan && (
                        <span className="text-xs text-slate-500">
                          {formatDate(getPostDate(currentPlan.createdAt, post.day))}
                        </span>
                      )}
                      {post.date_hint && (
                        <span className="text-xs text-slate-600 font-medium">
                          {post.date_hint}
                        </span>
                      )}
                      {post.time_hint && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {post.time_hint}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeCfg.badgeClass}`}
                      >
                        {typeCfg.label}
                      </span>
                      {isPublished && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Опубликовано
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <PublishButton
                        post={post}
                        planId={currentPlanId || undefined}
                        postIndex={idx}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyPost(post, idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Скопировать</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Заголовок жирным */}
                  <h4 className="text-base font-bold text-slate-900">
                    {post.title}
                  </h4>

                  {/* Тело поста */}
                  <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {post.body}
                  </div>

                  {/* Хэштеги: серые чипы с #тег */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {post.hashtags.map((tag, tIdx) => {
                        const cleanTag = tag.replace(/^#/, '');
                        return (
                          <span
                            key={tIdx}
                            className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium"
                          >
                            #{cleanTag}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* CTA: мелким синим текстом под body */}
                  {post.cta && (
                    <div className="pt-1 text-xs text-blue-600 font-medium">
                      🎯 {post.cta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* МОДАЛКА ИСТОРИИ */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            {/* Шапка модалки */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#0E9F9A]" />
                <h3 className="text-lg font-bold text-slate-900">
                  История планов
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {savedPlans.length > 0 && (
                  confirmClearAll ? (
                    <div className="flex items-center gap-1.5 text-xs bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
                      <span className="text-rose-700 font-medium">Очистить всё?</span>
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="text-rose-700 font-bold hover:underline cursor-pointer ml-1"
                      >
                        Да
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="text-slate-500 hover:text-slate-700 cursor-pointer ml-1"
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Очистить историю
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowHistory(false);
                    setPlanToDelete(null);
                    setConfirmClearAll(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Всплывающее предупреждение подтверждения удаления одного плана */}
            {planToDelete && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="text-amber-800 font-medium">
                  Удалить план «{planToDelete.title}»?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmDeletePlan(planToDelete.id)}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 cursor-pointer"
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanToDelete(null)}
                    className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Тело модалки */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {savedPlans.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Пока нет сохранённых планов
                </div>
              ) : (
                savedPlans.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {p.plan_title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDateTime(p.createdAt)} • {p.posts?.length || 0} постов
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResult({
                            plan_title: p.plan_title,
                            posts: p.posts,
                          });
                          setFormData(p.request);
                          setCurrentPlanId(p.id);
                          setShowHistory(false);
                          setPlanToDelete(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition-colors cursor-pointer"
                        title="Открыть план"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#0E9F9A]" />
                        <span>Открыть</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlanToDelete({ id: p.id, title: p.plan_title });
                        }}
                        className="inline-flex items-center p-1.5 rounded-md text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="Удалить план"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
