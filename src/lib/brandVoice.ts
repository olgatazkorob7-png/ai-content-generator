import { useState, useCallback, useEffect } from 'react';
import type { BrandVoice } from '../types';

export const STORAGE_KEY = 'aicm:brand-voice';

export const EMPTY_BRAND_VOICE: BrandVoice = {
  version: 1,
  companyName: '',
  industry: '',
  icp: '',
  painPoints: '',
  uvp: '',
  tone: '',
  bannedWords: '',
  goodExamples: '',
  extraNotes: '',
  updatedAt: '',
};

export function getBrandVoice(): BrandVoice {
  if (typeof window === 'undefined') {
    return { ...EMPTY_BRAND_VOICE };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_BRAND_VOICE };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...EMPTY_BRAND_VOICE };
    }
    return {
      ...EMPTY_BRAND_VOICE,
      ...parsed,
      version: 1,
    };
  } catch {
    return { ...EMPTY_BRAND_VOICE };
  }
}

export function saveBrandVoice(v: BrandVoice): void {
  try {
    const dataToSave: BrandVoice = {
      ...EMPTY_BRAND_VOICE,
      ...v,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aicm:brand-voice-changed'));
    }
  } catch (error: any) {
    throw new Error(`Не удалось сохранить профиль: ${error?.message || 'ошибка квоты хранилища'}`);
  }
}

export function clearBrandVoice(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aicm:brand-voice-changed'));
    }
  } catch (error) {
    console.error('Ошибка при очистке brand-voice:', error);
  }
}

export function isBrandVoiceFilled(v: BrandVoice): boolean {
  return (
    typeof v.companyName === 'string' &&
    v.companyName.trim().length > 0 &&
    typeof v.uvp === 'string' &&
    v.uvp.trim().length > 0
  );
}

export function buildBrandVoiceContext(v: BrandVoice): string {
  const hasName = typeof v.companyName === 'string' && v.companyName.trim().length > 0;
  const hasUvp = typeof v.uvp === 'string' && v.uvp.trim().length > 0;

  if (!hasName && !hasUvp) {
    return '';
  }

  const lines: string[] = ['КОНТЕКСТ КОМПАНИИ:'];

  if (v.companyName?.trim()) lines.push(`— Компания: ${v.companyName.trim()}`);
  if (v.industry?.trim()) lines.push(`— Отрасль: ${v.industry.trim()}`);
  if (v.icp?.trim()) lines.push(`— Идеальный клиент: ${v.icp.trim()}`);
  if (v.painPoints?.trim()) lines.push(`— Боли клиента: ${v.painPoints.trim()}`);
  if (v.uvp?.trim()) lines.push(`— УТП: ${v.uvp.trim()}`);
  if (v.tone?.trim()) lines.push(`— Tone of voice: ${v.tone.trim()}`);
  if (v.bannedWords?.trim()) lines.push(`— Запрещённые слова: ${v.bannedWords.trim()}`);
  if (v.goodExamples?.trim()) {
    lines.push('— Примеры хорошего контента:');
    lines.push(v.goodExamples.trim());
  }
  if (v.extraNotes?.trim()) lines.push(`— Дополнительные заметки: ${v.extraNotes.trim()}`);

  lines.push('');
  lines.push('Учитывай этот контекст во всём ответе. Соблюдай tone of voice и НИКОГДА не используй слова из списка запрещённых.');

  return lines.join('\n');
}

export function exportBrandVoice(v: BrandVoice): void {
  const payload = JSON.stringify(v, null, 2);
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brand-voice.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBrandVoice(file: File): Promise<BrandVoice> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Некорректный формат JSON-файла');
  }

  return {
    ...EMPTY_BRAND_VOICE,
    companyName: typeof parsed.companyName === 'string' ? parsed.companyName : '',
    industry: typeof parsed.industry === 'string' ? parsed.industry : '',
    icp: typeof parsed.icp === 'string' ? parsed.icp : '',
    painPoints: typeof parsed.painPoints === 'string' ? parsed.painPoints : '',
    uvp: typeof parsed.uvp === 'string' ? parsed.uvp : '',
    tone: typeof parsed.tone === 'string' ? parsed.tone : '',
    bannedWords: typeof parsed.bannedWords === 'string' ? parsed.bannedWords : '',
    goodExamples: typeof parsed.goodExamples === 'string' ? parsed.goodExamples : '',
    extraNotes: typeof parsed.extraNotes === 'string' ? parsed.extraNotes : '',
    version: 1,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
  };
}

export function useBrandVoice(): {
  brandVoice: BrandVoice;
  setBrandVoice: (v: BrandVoice) => void;
  save: () => void;
  refresh: () => void;
  clear: () => void;
  isFilled: boolean;
  error: string | null;
} {
  const [brandVoice, setBrandVoice] = useState<BrandVoice>(() => getBrandVoice());
  const [error, setError] = useState<string | null>(null);

  const isFilled = isBrandVoiceFilled(brandVoice);

  const refresh = useCallback(() => {
    setBrandVoice(getBrandVoice());
  }, []);

  const clear = useCallback(() => {
    clearBrandVoice();
    setBrandVoice({ ...EMPTY_BRAND_VOICE });
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setBrandVoice(getBrandVoice());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('aicm:brand-voice-changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('aicm:brand-voice-changed', handleSync);
    };
  }, []);

  const save = useCallback(() => {
    try {
      setError(null);
      saveBrandVoice(brandVoice);
      setBrandVoice(getBrandVoice());
    } catch (err: any) {
      setError(err?.message || 'Не удалось сохранить профиль');
    }
  }, [brandVoice]);

  return {
    brandVoice,
    setBrandVoice,
    save,
    refresh,
    clear,
    isFilled,
    error,
  };
}
