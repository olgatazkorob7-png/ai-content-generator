import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { INDUSTRIES } from '../lib/presets';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import type { AvatarData } from '../types';

export function AvatarTab() {
  const [industry, setIndustry] = useState('services');
  const [brandVoice, setBrandVoice] = useState(() => getBrandVoice());

  // Форма параметров видео
  const [formData, setFormData] = useState<AvatarData>(() => {
    const bv = getBrandVoice();
    return {
      industry: 'services',
      companyName: bv.companyName?.trim() || '',
      product: '',
      targetPain: '',
      avatarRole: 'executive',
      videoFormat: '16:9',
      durationSeconds: 30,
    };
  });

  // Синхронизация названия компании при изменении профиля в реальном времени
  useEffect(() => {
    const syncBrandVoice = () => {
      const bv = getBrandVoice();
      setBrandVoice(bv);
      if (bv.companyName) {
        setFormData((prev) => {
          if (!prev.companyName?.trim()) {
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

  const handleIndustryChange = (id: string) => {
    setIndustry(id);
    setFormData((prev) => ({ ...prev, industry: id }));
  };

  // Состояние списка голосов HeyGen
  const [voices, setVoices] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [voicesError, setVoicesError] = useState<string | null>(null);

  // Состояние списка аватаров HeyGen
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>();
  const [avatarsError, setAvatarsError] = useState<string | null>(null);

  // Состояние образов (looks) аватара
  const [selectedLookId, setSelectedLookId] = useState<string>();
  const [avatarLooks, setAvatarLooks] = useState<{ [groupId: string]: any[] }>({});
  const [loadingLooksForGroupId, setLoadingLooksForGroupId] = useState<string | null>(null);
  const [looksError, setLooksError] = useState<string | null>(null);

  // Состояния генерации текста
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Состояния реальной генерации видео HeyGen (Part 7E)
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<any>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasGeneratedVideo, setHasGeneratedVideo] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // Очистка интервала опроса при размонтировании
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Выбранный голос, аватар и образ для панели статуса
  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);
  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);
  const selectedLook =
    selectedAvatarId && avatarLooks[selectedAvatarId]?.find((l: any) => l.id === selectedLookId);

  // Загрузка голосов
  const handleLoadVoices = async () => {
    setLoadingVoices(true);
    setVoicesError(null);
    try {
      const res = await fetch('/api/heygen/voices?engine=starfish');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка загрузки');
      setVoices(data.data || data.voices || []);
    } catch (err: any) {
      setVoicesError(err.message || 'Не удалось загрузить голоса');
    } finally {
      setLoadingVoices(false);
    }
  };

  // Загрузка аватаров
  const handleLoadAvatars = async () => {
    setLoadingAvatars(true);
    setAvatarsError(null);
    try {
      const res = await fetch('/api/heygen/avatars');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка загрузки');
      console.log('[UI] First avatar from /api/heygen/avatars:', data.data?.[0]);
      setAvatars(data.data || []);
    } catch (err: any) {
      setAvatarsError(err.message || 'Не удалось загрузить аватары');
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    handleLoadVoices();
    handleLoadAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Выбор аватара и подгрузка его образов (looks)
  const handleSelectAvatar = async (avatar: any) => {
    setSelectedAvatarId(avatar.id);
    setLooksError(null);

    // Если образы для этого аватара уже загружены
    if (avatarLooks[avatar.id] && avatarLooks[avatar.id].length > 0) {
      const looks = avatarLooks[avatar.id];
      // Если образ ещё не выбран или был выбран от другого аватара
      if (!selectedLookId || !looks.some((l: any) => l.id === selectedLookId)) {
        setSelectedLookId(looks[0].id);
      }
      return;
    }

    setLoadingLooksForGroupId(avatar.id);
    try {
      const res = await fetch(`/api/heygen/avatar-looks?group_id=${encodeURIComponent(avatar.id)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка загрузки образов');
      const looks = data.data || [];
      setAvatarLooks((prev) => ({ ...prev, [avatar.id]: looks }));
      if (looks.length > 0) {
        setSelectedLookId(looks[0].id);
      }
    } catch (err: any) {
      console.error('[UI] Error loading avatar looks:', err);
      setLooksError(err.message || 'Не удалось загрузить образы');
    } finally {
      setLoadingLooksForGroupId(null);
    }
  };

  // Генерация сценария видео-аватара
  const handleGenerate = async () => {
    setError(null);

    if (!formData.product.trim()) {
      setError('Укажите продукт / услугу');
      return;
    }
    if (!formData.targetPain.trim()) {
      setError('Опишите боль клиента');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/generate-avatar-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка генерации');
      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать текст');
    } finally {
      setLoading(false);
    }
  };

  // Создание реального видео HeyGen (Part 7E с look_id)
  const handleCreateVideo = async () => {
    if (!selectedVoice) {
      console.warn('[UI] handleCreateVideo: voice not selected');
      setVideoError('Выберите голос');
      return;
    }

    if (!selectedAvatarId) {
      console.warn('[UI] handleCreateVideo: avatar not selected');
      setVideoError('Выберите аватара');
      return;
    }

    if (!selectedLookId) {
      console.warn('[UI] handleCreateVideo: look not selected');
      setVideoError('Выберите образ аватара');
      return;
    }

    if (!result) {
      console.warn('[UI] handleCreateVideo: script result missing');
      setVideoError('Сначала сгенерируйте текст для озвучки');
      return;
    }

    if (hasGeneratedVideo) {
      console.warn('[UI] handleCreateVideo: video already generated in this session');
      return;
    }

    // Confirmation removed — sandbox blocks window.confirm
    // In production, use a custom modal instead

    console.log('[UI] handleCreateVideo called', {
      selectedVoiceId,
      selectedAvatarId,
      selectedLookId,
      hasResult: !!result,
      hasGeneratedVideo,
    });

    setVideoLoading(true);
    setVideoError(null);
    setVideoResult(null);

    try {
      const payload = {
        avatarId: selectedLookId, // Используем selectedLookId вместо group_id
        voiceId: selectedVoiceId,
        text: `${result.hook}\n\n${result.body}\n\n${result.cta}`,
        aspectRatio: formData.videoFormat === 'vertical_9_16' ? '9:16' : '16:9',
      };

      console.log('[UI] Sending create-video request with payload:', payload);

      const res = await fetch('/api/heygen/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[UI] create-video response:', data);

      if (!data.success || !data.video_id) {
        throw new Error(data.error || 'Не удалось запустить создание видео');
      }

      const videoId = data.video_id;

      // Опрос статуса каждые 5 секунд (максимум 3 минуты = 36 попыток)
      let attempts = 0;
      const maxAttempts = 36;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/heygen/video-status/${videoId}`);
          const statusData = await statusRes.json();
          console.log(`[UI] Poll attempt #${attempts} status:`, statusData);

          if (statusData.status === 'completed' && statusData.video_url) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setVideoResult(statusData);
            setHasGeneratedVideo(true);
            setVideoLoading(false);
          } else if (statusData.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setVideoError(statusData.error || 'Ошибка рендеринга видео в HeyGen');
            setVideoLoading(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setVideoError('Видео всё ещё обрабатывается, попробуйте обновить страницу позже');
            setVideoLoading(false);
          }
        } catch (pollErr: any) {
          console.error('[UI] Video poll error:', pollErr);
          if (attempts >= maxAttempts) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setVideoError('Видео всё ещё обрабатывается, попробуйте обновить страницу позже');
            setVideoLoading(false);
          }
        }
      }, 5000);
    } catch (err: any) {
      console.error('[UI] handleCreateVideo error:', err);
      setVideoError(err.message || 'Ошибка создания видео');
      setVideoLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200">
      <h2 className="text-base font-bold text-[#102A43] mb-3">
        Параметры видео-аватара
      </h2>

      {/* SECTION 1: Industry presets */}
      <div className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
          Пресеты по сферам бизнеса
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              type="button"
              onClick={() => handleIndustryChange(ind.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                industry === ind.id
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

      {/* Кнопки загрузки */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleLoadVoices}
          disabled={loadingVoices}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E9F9A] text-white rounded-lg text-sm font-semibold hover:bg-[#0c8a85] disabled:opacity-50 transition-colors"
        >
          {loadingVoices ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <>
              <span>🎙</span>
              <span>Загрузить голоса</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleLoadAvatars}
          disabled={loadingAvatars}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E9F9A] text-white rounded-lg text-sm font-semibold hover:bg-[#0c8a85] disabled:opacity-50 transition-colors"
        >
          {loadingAvatars ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <>
              <span>🎬</span>
              <span>Загрузить аватары</span>
            </>
          )}
        </button>
      </div>

      {/* Панель текущего выбора */}
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 mb-4 text-sm">
        <span>
          🎙 {selectedVoice?.name || 'Голос не выбран'}
        </span>
        <span className="text-slate-300">·</span>
        <span>
          🎬{' '}
          {selectedAvatar
            ? `${selectedAvatar.name}${selectedLook ? ` (${selectedLook.name})` : ''}`
            : 'Аватар не выбран'}
        </span>
      </div>

      {/* Списки голосов и аватаров */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-[#102A43] mb-2">
            Голоса HeyGen
          </h3>
          <div id="voices-list" className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loadingVoices && (
              <p className="text-xs text-slate-500">Загрузка голосов...</p>
            )}

            {voicesError && (
              <p className="text-xs text-rose-600">{voicesError}</p>
            )}

            {!loadingVoices && !voicesError && voices.length === 0 && (
              <p className="text-xs text-slate-400">Нажмите "Загрузить голоса"</p>
            )}

            {voices.map((v) => {
              const isSelected = selectedVoiceId === v.voice_id;
              return (
                <div
                  key={v.voice_id}
                  onClick={() => setSelectedVoiceId(v.voice_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0E9F9A] bg-[#0E9F9A]/5'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-[#102A43]">{v.name}</span>
                    {isSelected && <span className="text-[#0E9F9A]">✓</span>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {v.language} · {v.gender}
                  </p>
                  {v.preview_audio_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        new Audio(v.preview_audio_url).play();
                      }}
                      className="mt-2 text-xs text-[#0E9F9A] hover:underline flex items-center gap-1"
                    >
                      ▶️ Прослушать
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#102A43] mb-2">
            Аватары HeyGen
          </h3>
          <div id="avatars-list" className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loadingAvatars && (
              <p className="text-xs text-slate-500">Загрузка аватаров...</p>
            )}

            {avatarsError && (
              <p className="text-xs text-rose-600">{avatarsError}</p>
            )}

            {!loadingAvatars && !avatarsError && avatars.length === 0 && (
              <p className="text-xs text-slate-400">Нажмите "Загрузить аватары"</p>
            )}

            {avatars.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {avatars.map((a) => {
                  const isSelected = selectedAvatarId === a.id;
                  const currentLooks = avatarLooks[a.id] || [];
                  const isLoadingLooks = loadingLooksForGroupId === a.id;

                  return (
                    <div key={a.id} className="flex flex-col">
                      <div
                        onClick={() => handleSelectAvatar(a)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'border-[#0E9F9A] bg-[#0E9F9A]/5'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={a.preview_image_url}
                          alt={a.name}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#102A43] truncate">
                              {a.name}
                            </span>
                            {isSelected && <span className="text-[#0E9F9A]">✓</span>}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {a.looks_count} {a.looks_count === 1 ? 'образ' : a.looks_count >= 2 && a.looks_count <= 4 ? 'образа' : 'образов'}
                          </p>
                        </div>
                      </div>

                      {/* Список образов (looks) при выборе аватара */}
                      {isSelected && (
                        <div className="mt-1.5 p-2 bg-slate-50 border border-[#0E9F9A]/30 rounded-lg">
                          <p className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                            <span>Образ:</span>
                            {isLoadingLooks && (
                              <span className="text-[10px] text-[#0E9F9A] flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка...
                              </span>
                            )}
                          </p>

                          {looksError && !isLoadingLooks && currentLooks.length === 0 && (
                            <p className="text-[10px] text-rose-600">{looksError}</p>
                          )}

                          {currentLooks.length > 0 && (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {currentLooks.map((look: any) => {
                                const isLookSelected = selectedLookId === look.id;
                                return (
                                  <div
                                    key={look.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLookId(look.id);
                                    }}
                                    className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[11px] border transition-colors ${
                                      isLookSelected
                                        ? 'border-[#0E9F9A] bg-[#0E9F9A]/10 text-[#0E9F9A] font-bold'
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                    }`}
                                  >
                                    {look.preview_image_url && (
                                      <img
                                        src={look.preview_image_url}
                                        alt={look.name}
                                        className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
                                      />
                                    )}
                                    <span className="truncate flex-1">{look.name}</span>
                                    {isLookSelected && <span>✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Форма параметров видео */}
      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-[#102A43] mb-3">
          Параметры видео
        </h3>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Компания
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
              value={formData.companyName || ''}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
              placeholder={brandVoice.companyName || "Название вашей компании"}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Продукт / услуга *
            </label>
            <input
              type="text"
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
              placeholder="Например: Пакет юридической защиты IT-контрактов"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Боль клиента *
            </label>
            <textarea
              rows={2}
              value={formData.targetPain}
              onChange={(e) => setFormData({ ...formData, targetPain: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]"
              placeholder="Какую проблему решает ваш продукт"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Роль аватара
              </label>
              <select
                value={formData.avatarRole}
                onChange={(e) => setFormData({ ...formData, avatarRole: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] bg-white"
              >
                <option value="executive">Уверенный топ-менеджер</option>
                <option value="friendly_consultant">Дружелюбный консультант</option>
                <option value="tech_lead">Технический специалист</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Формат
              </label>
              <select
                value={formData.videoFormat}
                onChange={(e) => setFormData({ ...formData, videoFormat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] bg-white"
              >
                <option value="16:9">16:9 — сайт, презентация</option>
                <option value="vertical_9_16">9:16 — Reels, Shorts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Длительность
              </label>
              <select
                value={formData.durationSeconds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationSeconds: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] bg-white"
              >
                <option value={30}>30 секунд</option>
                <option value={60}>60 секунд</option>
                <option value={90}>90 секунд</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Кнопка генерации текста */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#0E9F9A] hover:bg-[#0c8a85] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Генерация...</span>
              </>
            ) : (
              '✨ Сгенерировать текст для озвучки'
            )}
          </button>
        </div>

        {/* SECTION 4: Отображение ошибок генерации текста */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm mt-4">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {/* SECTION 6: Предупреждение о нехватке данных */}
        {result?.missing_data?.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl">
            <strong className="text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Не хватает данных:
            </strong>
            <p className="text-sm mt-1 text-amber-700">{result.missing_data.join(', ')}</p>
          </div>
        )}

        {/* SECTION 5: Отображение сгенерированного текста и создание видео */}
        {result && !result.missing_data?.length && (
          <div className="mt-6 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* MetaBadge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-slate-100 border border-slate-200 mb-4">
              <span>📋</span>
              <span className="font-bold text-[#0E9F9A]">
                {result.meta?.duration_sec} секунд
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">{result.meta?.goal || 'заявка'}</span>
            </div>

            <h3 className="text-base font-bold text-[#102A43] mb-4">
              Текст для видео-аватара
            </h3>

            {/* Hook */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Hook</p>
              <p className="text-sm text-[#102A43] leading-relaxed">
                {result.hook}
              </p>
            </div>

            {/* Body */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Body</p>
              <p className="text-sm text-[#102A43] leading-relaxed">
                {result.body}
              </p>
            </div>

            {/* CTA */}
            <div className="mb-4 p-3 rounded-lg bg-[#0E9F9A]/10 border border-[#0E9F9A]/30">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0E9F9A] mb-1">CTA</p>
              <p className="text-sm font-semibold text-[#102A43]">
                {result.cta}
              </p>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const text = `Hook: ${result.hook}\n\nBody: ${result.body}\n\nCTA: ${result.cta}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Скопировано!' : '📋 Скопировать текст'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `Hook: ${result.hook}\n\nBody: ${result.body}\n\nCTA: ${result.cta}`;
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `avatar-script-${Date.now()}.txt`;
                  link.style.display = 'none';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>💾 Скачать .txt</span>
              </button>
            </div>

            {/* TASK 3 & 4: Создание реального видео-аватара HeyGen */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={videoLoading || hasGeneratedVideo}
                onClick={handleCreateVideo}
                className="w-full px-5 py-3 rounded-xl font-bold text-sm bg-[#0E9F9A] hover:bg-[#0c8a85] text-white transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {videoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>🎬 Генерация видео в HeyGen...</span>
                  </>
                ) : hasGeneratedVideo ? (
                  'Видео уже создано'
                ) : (
                  '🎬 Создать видео-аватар'
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-2">
                Тестовый режим: одно видео на сессию. Стоимость ~$0.5 за 30 секунд.
              </p>

              {/* Индикатор загрузки видео */}
              {videoLoading && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-900 font-medium">
                    🎬 Создание видео... Обычно занимает 1–3 минуты.
                  </p>
                  <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0E9F9A] animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}

              {/* Ошибка видео */}
              {videoError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
                  <strong>Ошибка видео:</strong> {videoError}
                </div>
              )}

              {/* Готовое видео */}
              {videoResult && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h4 className="text-sm font-bold text-emerald-900 mb-3">
                    ✅ Видео готово!
                  </h4>
                  <video
                    controls
                    src={videoResult.video_url}
                    className="w-full rounded-lg mb-3 max-h-96 bg-black"
                  />
                  <a
                    href={videoResult.video_url}
                    download={`avatar-video-${Date.now()}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E9F9A] text-white rounded-lg text-sm font-semibold hover:bg-[#0c8a85] transition-colors"
                  >
                    💾 Скачать MP4
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
