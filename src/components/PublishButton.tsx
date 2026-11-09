import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, CheckCircle2, AlertCircle, Paperclip, Trash2 } from 'lucide-react';
import { markPostPublished } from '../lib/contentPlanStorage';

type PublishPlatform = 'telegram' | 'vk';

interface Props {
  post: {
    title: string;
    body: string;
    hashtags: string[];
    cta: string;
  };
  planId?: string;
  postIndex?: number;
  initialPlatform?: PublishPlatform;
  variant?: 'split' | 'single';
}

export function PublishButton({
  post,
  planId,
  postIndex,
  initialPlatform = 'vk',
  variant = 'split',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<PublishPlatform>(initialPlatform);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  // Состояния для прикрепления картинки
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Собирает текст: {title}\n\n{body}\n\n#{теги через пробел}\n\n{cta}
  const buildInitialText = () => {
    const tags = (post.hashtags || [])
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .join(' ');
    return [post.title, post.body, tags, post.cta]
      .filter(Boolean)
      .join('\n\n');
  };

  const [text, setText] = useState(buildInitialText);

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения (PNG, JPG, WebP и т.д.)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла превышает 5 МБ. Пожалуйста, выберите изображение поменьше.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleOpen = (targetPlatform: PublishPlatform = 'vk') => {
    setPlatform(targetPlatform);
    setText(buildInitialText());
    clearImage();
    setError(null);
    setSuccess(false);
    setUrl(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPublishing) {
      clearImage();
      setIsOpen(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setSuccess(false);
    setUrl(null);

    const endpoint = platform === 'vk' ? '/api/publish/vk' : '/api/publish/telegram';

    try {
      let res: Response;

      if (imageFile !== null) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(post));
        formData.append('customText', text);
        formData.append('image', imageFile);

        // ВАЖНО: не ставим 'Content-Type', браузер сам установит multipart/form-data с boundary
        res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: post,
            customText: text,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (platform === 'vk' ? 'VK вернул ошибку' : 'Telegram вернул ошибку'));
      }

      setSuccess(true);
      setUrl(data.url || null);

      if (planId && typeof postIndex === 'number') {
        markPostPublished(planId, postIndex);
      }

      window.dispatchEvent(new CustomEvent('aicm:plan-updated'));
    } catch (err: any) {
      setError(err?.message || (platform === 'vk' ? 'Ошибка при отправке в VK' : 'Ошибка при отправке в Telegram'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      {variant === 'split' ? (
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpen('vk')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0077FF] hover:bg-[#0066dd] active:bg-[#0055cc] text-white transition-colors cursor-pointer shadow-xs"
            title="Опубликовать этот пост в ВКонтакте"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px] font-black">
              В
            </span>
            <span>ВК</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpen('telegram')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#229ED9] hover:bg-[#1d8bc0] active:bg-[#1877a5] text-white transition-colors cursor-pointer shadow-xs"
            title="Опубликовать этот пост в Telegram"
          >
            <Send className="w-3.5 h-3.5" />
            <span>TG</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handleOpen(initialPlatform)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white transition-colors cursor-pointer"
          title="Опубликовать пост"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Опубликовать</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            {/* Заголовок + крестик */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#0E9F9A]" />
                <h3 className="text-lg font-bold text-slate-900">
                  Опубликовать пост
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPublishing}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Контент */}
            <div className="p-6 space-y-4">
              {/* Выбор платформы */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Платформа для публикации:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => {
                      setPlatform('vk');
                      setError(null);
                      setSuccess(false);
                      setUrl(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      platform === 'vk'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#0077FF] text-white flex items-center justify-center font-bold text-xs">
                      VK
                    </span>
                    <span>ВКонтакте</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => {
                      setPlatform('telegram');
                      setError(null);
                      setSuccess(false);
                      setUrl(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      platform === 'telegram'
                        ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center font-bold text-xs">
                      TG
                    </span>
                    <span>Telegram</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Текст поста:
                </label>
                <textarea
                  rows={8}
                  value={text}
                  disabled={isPublishing}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#0E9F9A] outline-none leading-relaxed"
                />
              </div>

              {/* Прикрепление изображения */}
              <div className="border border-dashed border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  hidden
                  onChange={handleFileChange}
                />

                {!imagePreview ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span>Прикрепить картинку к посту (до 5 МБ)</span>
                    </div>
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#0E9F9A]" />
                      <span>Выбрать изображение</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                      <img
                        src={imagePreview}
                        alt="Превью"
                        className="max-h-32 max-w-[200px] object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {imageFile?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {imageFile && (imageFile.size / 1024 / 1024).toFixed(2)} МБ
                      </div>
                      <button
                        type="button"
                        disabled={isPublishing}
                        onClick={clearImage}
                        className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить картинку</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Статусы */}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ✓ Опубликовано в {platform === 'vk' ? 'ВКонтакте' : 'Telegram'}
                  </span>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline ml-1 hover:text-emerald-800"
                    >
                      открыть пост
                    </a>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>✗ {error}</span>
                </div>
              )}
            </div>

            {/* Подвал */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPublishing}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                  platform === 'vk'
                    ? 'bg-[#0077FF] hover:bg-[#0066dd] active:bg-[#0055cc]'
                    : 'bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572]'
                }`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Публикация...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Опубликовать в {platform === 'vk' ? 'ВК' : 'Telegram'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
