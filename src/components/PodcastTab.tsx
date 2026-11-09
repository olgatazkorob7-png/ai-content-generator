import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Users,
  User,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  FileDown,
  Code,
  Volume2,
  Download,
  Info,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FileText,
} from 'lucide-react';
import { INDUSTRIES } from '../lib/presets';
import { MetaBadge } from './MetaBadge';
import { stripMarkdown } from '../lib/validate';
import { getBrandVoice, buildBrandVoiceContext } from '../lib/brandVoice';
import type { PodcastData } from '../types';

interface DialogueReplica {
  speaker: string;
  text: string;
  cue?: string;
}

interface GeneratedPodcastResponse {
  title: string;
  intro: DialogueReplica[] | string;
  script?: DialogueReplica[];
  body?: string[];
  outro: DialogueReplica[] | string;
  missing_data?: string[];
  meta?: {
    context?: string;
    tone?: string;
    goal?: string;
    format?: string;
    duration_estimate?: string;
  };
}

interface HeyGenVoice {
  voice_id: string;
  name: string;
  gender?: string;
  language?: string;
}

interface AudioTrackItem {
  url: string;
  speaker: string;
  text: string;
  isHost: boolean;
}

const INITIAL_FORM: PodcastData = {
  format: 'dialogue',
  industry: 'it',
  topic: '',
  hostName: 'Анна',
  speakerName: '',
  guestName: '',
  guestPosition: '',
  guestCompany: '',
  keyInsight: '',
  targetDuration: '20 минут',
  businessGoal: 'Прогрев',
  voiceStyle: 'деловой, живой диалог',
};

const SAMPLE_DIALOGUE: PodcastData = {
  format: 'dialogue',
  industry: 'it',
  topic: 'Автоматизация финансовой отчётности',
  hostName: 'Анна',
  guestName: 'Иван Смирнов',
  guestPosition: 'Финансовый директор',
  guestCompany: 'Ромашка Софт',
  keyInsight: 'Экономия 40 часов в месяц на ручной сверке',
  targetDuration: '20 минут',
  businessGoal: 'Прогрев',
  voiceStyle: 'деловой, экспертный',
};

const SAMPLE_MONOLOGUE: PodcastData = {
  format: 'monologue',
  industry: 'lawyers',
  topic: '5 критических ошибок в партнёрских договорах',
  speakerName: 'Алексей Мельников',
  guestPosition: 'Управляющий партнёр',
  guestCompany: 'ЮрКонсалт',
  keyInsight: 'Отсутствие механизма разрешения deadlock разрушает 60% партнёрств',
  targetDuration: '20 минут',
  businessGoal: 'Экспертность',
  voiceStyle: 'экспертный, практический',
};

const DURATION_OPTIONS = [
  '3-5 минут',
  '10-15 минут',
  '20 минут',
  '30 минут',
];

const GOAL_OPTIONS = [
  'Прогрев',
  'Экспертность',
  'Запись на консультацию',
  'Подписка',
  'Продажа решения',
];

// Дефолтные голоса HeyGen (русские) на случай задержки загрузки списка
const DEFAULT_HEYGEN_VOICES: HeyGenVoice[] = [
  { voice_id: '1bd001e7e50f421d891986aad5c8bbd2', name: 'Анна (Русский)', gender: 'female', language: 'Russian' },
  { voice_id: '2d5b0e6cf3a3460aa9f4604e1a96bc0c', name: 'Иван (Русский)', gender: 'male', language: 'Russian' },
  { voice_id: '077ab11b14f045c0b4954434d130479f', name: 'Дмитрий (Русский)', gender: 'male', language: 'Russian' },
  { voice_id: '131a436e60e64951ab5053081b61030e', name: 'Елена (Русский)', gender: 'female', language: 'Russian' },
];

// Функция очистки текста от начальной нумерации модели и префиксов спикера
const cleanParagraph = (text: string): string => {
  let stripped = stripMarkdown(text).trim();
  // Убираем нумерацию (1., 1) и т.д.)
  stripped = stripped.replace(/^\d+[\.\)\s]*/, '').trim();
  // Убираем типовые префиксы спикера ("Спикер:", "Ведущий:", "Гость:" и др.)
  stripped = stripped.replace(/^(спикер|speaker|ведущий|ведущая|гость)\s*:\s*/i, '').trim();
  // Убираем любые имена спикеров в начале строки ("Имя: " или "Имя Фамилия: ")
  stripped = stripped.replace(/^[A-Za-zА-Яа-яЁё]+(\s+[A-Za-zА-Яа-яЁё]+)?\s*:\s*/, '').trim();
  return stripped;
};

// Функция разбивки длинного текста на части не более maxLen символов
const splitIntoChunks = (text: string, maxLen = 4500): string[] => {
  if (text.length <= maxLen) return [text];
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > maxLen) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
};

export function PodcastTab() {
  const [brandVoice, setBrandVoice] = useState(() => getBrandVoice());
  const [formData, setFormData] = useState<PodcastData>(() => {
    const bv = getBrandVoice();
    return {
      ...INITIAL_FORM,
      guestCompany: bv.companyName?.trim() || '',
    };
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedPodcastResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showJson, setShowJson] = useState<boolean>(false);

  // Синхронизация названия компании при изменении профиля в реальном времени
  useEffect(() => {
    const syncBrandVoice = () => {
      const bv = getBrandVoice();
      setBrandVoice(bv);
      if (bv.companyName) {
        setFormData((prev) => {
          if (!prev.guestCompany?.trim()) {
            return {
              ...prev,
              guestCompany: bv.companyName,
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

  // Озвучка HeyGen TTS
  const [heygenVoices, setHeygenVoices] = useState<HeyGenVoice[]>(DEFAULT_HEYGEN_VOICES);
  const [hostVoiceId, setHostVoiceId] = useState<string>('1bd001e7e50f421d891986aad5c8bbd2');
  const [guestVoiceId, setGuestVoiceId] = useState<string>('2d5b0e6cf3a3460aa9f4604e1a96bc0c');
  const [ttsLoading, setTtsLoading] = useState<boolean>(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [voiceoverCopied, setVoiceoverCopied] = useState<boolean>(false);
  const [isMergingAudio, setIsMergingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isDialogue = formData.format === 'dialogue';

  // Загрузка доступных голосов HeyGen с бэкенда
  useEffect(() => {
    fetch('/api/heygen/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.voices) && data.voices.length > 0) {
          setHeygenVoices(data.voices);
          setHostVoiceId(data.voices[0].voice_id);
          setGuestVoiceId(data.voices.length > 1 ? data.voices[1].voice_id : data.voices[0].voice_id);
        }
      })
      .catch((err) => {
        console.warn('Не удалось загрузить список голосов HeyGen:', err);
      });
  }, []);

  const handleFormatToggle = (format: 'dialogue' | 'monologue') => {
    setFormData((prev) => ({
      ...prev,
      format,
    }));
    setAudioUrls([]);
    setTtsError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFillSample = () => {
    if (formData.format === 'dialogue') {
      setFormData(SAMPLE_DIALOGUE);
    } else {
      setFormData(SAMPLE_MONOLOGUE);
    }
    setError(null);
    setAudioUrls([]);
    setTtsError(null);
  };

  const handleReset = () => {
    const bv = getBrandVoice();
    setFormData({
      ...INITIAL_FORM,
      guestCompany: bv.companyName?.trim() || '',
    });
    setResult(null);
    setError(null);
    setAudioUrls([]);
    setTtsError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      setError('Укажите тему выпуска');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioUrls([]);
    setTtsError(null);

    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brandVoiceContext: buildBrandVoiceContext(getBrandVoice()),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Не удалось сгенерировать сценарий подкаста');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Сборка списка реплик для озвучки (с привязкой голоса ведущего / гостя)
  const collectRepliesForTTS = (): { text: string; voiceId: string; speaker: string; isHost: boolean }[] => {
    if (!result) return [];
    const isDialogueFormat = formData.format === 'dialogue' || result.meta?.format === 'dialogue';
    const replies: { text: string; voiceId: string; speaker: string; isHost: boolean }[] = [];

    const isHostSpeaker = (speaker?: string): boolean => {
      if (!speaker) return true;
      const s = speaker.toLowerCase().trim();
      const host = (formData.hostName || 'анна').toLowerCase().trim();
      return s === host || s === 'анна' || s === 'ведущий' || s === 'ведущая' || (host.length > 2 && s.includes(host));
    };

    if (isDialogueFormat) {
      // Intro
      if (Array.isArray(result.intro)) {
        result.intro.forEach((r) => {
          const clean = cleanParagraph(r.text);
          if (clean) {
            const hostFlag = isHostSpeaker(r.speaker);
            replies.push({
              text: clean,
              voiceId: hostFlag ? hostVoiceId : guestVoiceId,
              speaker: r.speaker || (hostFlag ? (formData.hostName || 'Ведущий') : (formData.guestName || 'Гость')),
              isHost: hostFlag,
            });
          }
        });
      } else if (result.intro) {
        const clean = cleanParagraph(result.intro);
        if (clean) {
          replies.push({
            text: clean,
            voiceId: hostVoiceId,
            speaker: formData.hostName || 'Ведущий',
            isHost: true,
          });
        }
      }

      // Script
      if (result.script && result.script.length > 0) {
        result.script.forEach((r) => {
          const clean = cleanParagraph(r.text);
          if (clean) {
            const hostFlag = isHostSpeaker(r.speaker);
            replies.push({
              text: clean,
              voiceId: hostFlag ? hostVoiceId : guestVoiceId,
              speaker: r.speaker || (hostFlag ? (formData.hostName || 'Ведущий') : (formData.guestName || 'Гость')),
              isHost: hostFlag,
            });
          }
        });
      }

      // Outro
      if (Array.isArray(result.outro)) {
        result.outro.forEach((r) => {
          const clean = cleanParagraph(r.text);
          if (clean) {
            const hostFlag = isHostSpeaker(r.speaker);
            replies.push({
              text: clean,
              voiceId: hostFlag ? hostVoiceId : guestVoiceId,
              speaker: r.speaker || (hostFlag ? (formData.hostName || 'Ведущий') : (formData.guestName || 'Гость')),
              isHost: hostFlag,
            });
          }
        });
      } else if (result.outro) {
        const clean = cleanParagraph(result.outro);
        if (clean) {
          replies.push({
            text: clean,
            voiceId: hostVoiceId,
            speaker: formData.hostName || 'Ведущий',
            isHost: true,
          });
        }
      }
    } else {
      // Монолог: все части озвучиваются голосом спикера (hostVoiceId)
      const spk = formData.speakerName || 'Спикер';
      if (typeof result.intro === 'string' && result.intro.trim()) {
        const clean = cleanParagraph(result.intro);
        if (clean) replies.push({ text: clean, voiceId: hostVoiceId, speaker: spk, isHost: true });
      } else if (Array.isArray(result.intro)) {
        result.intro.forEach((r) => {
          const clean = cleanParagraph(r.text);
          if (clean) replies.push({ text: clean, voiceId: hostVoiceId, speaker: spk, isHost: true });
        });
      }

      if (result.body && result.body.length > 0) {
        result.body.forEach((p) => {
          const clean = cleanParagraph(p);
          if (clean) replies.push({ text: clean, voiceId: hostVoiceId, speaker: spk, isHost: true });
        });
      }

      if (typeof result.outro === 'string' && result.outro.trim()) {
        const clean = cleanParagraph(result.outro);
        if (clean) replies.push({ text: clean, voiceId: hostVoiceId, speaker: spk, isHost: true });
      } else if (Array.isArray(result.outro)) {
        result.outro.forEach((r) => {
          const clean = cleanParagraph(r.text);
          if (clean) replies.push({ text: clean, voiceId: hostVoiceId, speaker: spk, isHost: true });
        });
      }
    }

    return replies;
  };

  // Обработка кнопки озвучки: показ диалога подтверждения
  const handleOpenConfirm = () => {
    if (!result) return;
    setTtsError(null);
    setShowConfirmDialog(true);
  };

  // Выполнение синтеза речи через HeyGen Batch API
  const handleExecuteHeygenTTS = async () => {
    setShowConfirmDialog(false);
    if (!result) return;

    const replies = collectRepliesForTTS();
    if (replies.length === 0) {
      setTtsError('Текст подкаста пуст для озвучки');
      return;
    }

    setTtsLoading(true);
    setTtsError(null);
    setAudioTracks([]);
    setAudioUrls([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/tts/heygen/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replies: replies.map((r) => ({
            text: r.text,
            voiceId: r.voiceId,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.audio_urls)) {
        let msg = data.error || 'Не удалось получить аудио от HeyGen TTS';
        if (/voice\s*engine.*not\s*supported/i.test(msg) || /engine.*not\s*supported/i.test(msg)) {
          msg = 'Этот голос не поддерживает синтез речи. Выберите другой.';
        }
        throw new Error(msg);
      }

      const tracks: AudioTrackItem[] = data.audio_urls.map((url: string, i: number) => ({
        url,
        speaker: replies[i]?.speaker || `Реплика #${i + 1}`,
        text: replies[i]?.text || '',
        isHost: replies[i]?.isHost ?? true,
      }));

      setAudioTracks(tracks);
      setAudioUrls(data.audio_urls);
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Ошибка HeyGen TTS:', err);
      setTtsError(err.message || 'Ошибка синтеза речи через HeyGen');
    } finally {
      setTtsLoading(false);
    }
  };

  // Переключение воспроизведения конкретного трека
  const togglePlayTrack = (index: number) => {
    if (currentTrackIndex === index) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(console.error);
        setIsPlaying(true);
      }
    } else {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  // Воспроизведение с начала
  const handlePlayAll = () => {
    if (audioTracks.length === 0) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audioRef.current?.play().catch(console.error);
    }
  };

  // Предыдущий трек
  const handlePrevTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  // Следующий трек
  const handleNextTrack = () => {
    if (currentTrackIndex < audioTracks.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  // Автоматический переход к следующей реплике после завершения текущей
  const handleTrackEnded = () => {
    if (currentTrackIndex < audioTracks.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Эффект автозапуска при смене текущего трека
  useEffect(() => {
    if (audioRef.current && audioTracks.length > 0 && isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Ошибка запуска аудио:', err);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, isPlaying]);

  // Скачивание аудио MP3 через прокси-эндпоинт сервера
  const handleDownloadMp3 = (audioUrl: string, index?: number) => {
    if (!audioUrl) return;
    const proxyUrl = `/api/download-audio?url=${encodeURIComponent(audioUrl)}`;

    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = `podcast-${Date.now()}${index !== undefined ? `-part${index + 1}` : ''}.mp3`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Формирование полного текста озвучки целиком (все реплики и спикеры)
  const getVoiceoverFullText = (): string => {
    if (!result) return '';
    const parts: string[] = [];
    parts.push(`ПОДКАСТ: ${stripMarkdown(result.title)}`);
    parts.push(`ФОРМАТ: ${formData.format === 'dialogue' || result.meta?.format === 'dialogue' ? 'Диалог (2 голоса)' : 'Монолог'}`);
    parts.push(`ДАТА: ${new Date().toLocaleDateString('ru-RU')}`);
    parts.push('');
    parts.push('========================================');
    parts.push('ПОЛНЫЙ ТЕКСТ ОЗВУЧКИ');
    parts.push('========================================');
    parts.push('');

    if (audioTracks.length > 0) {
      audioTracks.forEach((track, idx) => {
        parts.push(`[${idx + 1}] ${track.speaker}:`);
        parts.push(track.text);
        parts.push('');
      });
    } else {
      const replies = collectRepliesForTTS();
      replies.forEach((r, idx) => {
        parts.push(`[${idx + 1}] ${r.speaker}:`);
        parts.push(r.text);
        parts.push('');
      });
    }

    return parts.join('\n');
  };

  // Скачивание всего текста озвучки целиком в .txt
  const handleDownloadVoiceoverText = () => {
    const text = getVoiceoverFullText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voiceover-full-text-${Date.now()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Копирование всего текста озвучки целиком в буфер обмена
  const handleCopyVoiceoverText = async () => {
    const text = getVoiceoverFullText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setVoiceoverCopied(true);
      setTimeout(() => setVoiceoverCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Скачивание всего аудио озвучки целиком в один файл
  const handleDownloadFullAudio = async () => {
    if (audioTracks.length === 0) return;
    setIsMergingAudio(true);
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const buffers: AudioBuffer[] = [];

      for (const track of audioTracks) {
        const proxyUrl = `/api/download-audio?url=${encodeURIComponent(track.url)}`;
        const res = await fetch(proxyUrl);
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        buffers.push(decoded);
      }

      // Склейка буферов
      const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
      const numberOfChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
      const merged = audioCtx.createBuffer(numberOfChannels, totalLength, audioCtx.sampleRate);

      for (let ch = 0; ch < numberOfChannels; ch++) {
        const channelData = merged.getChannelData(ch);
        let offset = 0;
        for (const b of buffers) {
          if (ch < b.numberOfChannels) {
            channelData.set(b.getChannelData(ch), offset);
          } else {
            channelData.set(b.getChannelData(0), offset);
          }
          offset += b.length;
        }
      }

      // Кодирование в WAV
      const numOfChan = merged.numberOfChannels;
      const length = merged.length * numOfChan * 2 + 44;
      const out = new DataView(new ArrayBuffer(length));
      let pos = 0;

      const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
          out.setUint8(pos++, str.charCodeAt(i));
        }
      };

      writeString('RIFF');
      out.setUint32(pos, length - 8, true);
      pos += 4;
      writeString('WAVE');
      writeString('fmt ');
      out.setUint32(pos, 16, true);
      pos += 4;
      out.setUint16(pos, 1, true);
      pos += 2;
      out.setUint16(pos, numOfChan, true);
      pos += 2;
      out.setUint32(pos, merged.sampleRate, true);
      pos += 4;
      out.setUint32(pos, merged.sampleRate * 2 * numOfChan, true);
      pos += 4;
      out.setUint16(pos, numOfChan * 2, true);
      pos += 2;
      out.setUint16(pos, 16, true);
      pos += 2;
      writeString('data');
      out.setUint32(pos, length - pos - 4, true);
      pos += 4;

      const channels: Float32Array[] = [];
      for (let i = 0; i < merged.numberOfChannels; i++) {
        channels.push(merged.getChannelData(i));
      }

      for (let offset = 0; offset < merged.length; offset++) {
        for (let i = 0; i < numOfChan; i++) {
          let sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          out.setInt16(pos, sample, true);
          pos += 2;
        }
      }

      const wavBlob = new Blob([out.buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `podcast-full-audio-${Date.now()}.wav`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      console.error('Ошибка объединения аудио:', err);
      setTtsError('Не удалось объединить аудиотреки в один файл: ' + (err.message || ''));
    } finally {
      setIsMergingAudio(false);
    }
  };

  // Форматирование полного текста для копирования и скачивания в .txt
  const getFullScriptText = (): string => {
    if (!result) return '';
    const parts: string[] = [];
    parts.push(`Название: ${stripMarkdown(result.title)}`);
    parts.push('');

    if (Array.isArray(result.intro)) {
      parts.push('=== ВСТУПЛЕНИЕ ===');
      result.intro.forEach((r) => {
        parts.push(`${r.speaker}: ${stripMarkdown(r.text)}`);
      });
      parts.push('');
    } else if (result.intro) {
      parts.push('=== ВСТУПЛЕНИЕ ===');
      parts.push(stripMarkdown(result.intro));
      parts.push('');
    }

    if (result.script && result.script.length > 0) {
      parts.push('=== ОСНОВНОЙ ДИАЛОГ ===');
      result.script.forEach((r) => {
        parts.push(`${r.speaker}: ${stripMarkdown(r.text)}`);
      });
      parts.push('');
    }

    if (result.body && result.body.length > 0) {
      parts.push('=== ОСНОВНАЯ ЧАСТЬ ===');
      result.body.forEach((p) => {
        parts.push(cleanParagraph(p));
        parts.push('');
      });
    }

    if (Array.isArray(result.outro)) {
      parts.push('=== ЗАВЕРШЕНИЕ И CTA ===');
      result.outro.forEach((r) => {
        parts.push(`${r.speaker}: ${stripMarkdown(r.text)}`);
      });
    } else if (result.outro) {
      parts.push('=== ЗАВЕРШЕНИЕ И CTA ===');
      parts.push(stripMarkdown(result.outro));
    }

    return parts.join('\n');
  };

  // 1. Скопировать текст
  const handleCopyText = async () => {
    const text = getFullScriptText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // 2. Скачать .txt
  const handleDownloadTxt = () => {
    const text = getFullScriptText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `podcast-${Date.now()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 3. Скачать .json
  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `podcast-${Date.now()}.json`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const displayDuration = result?.meta?.duration_estimate || formData.targetDuration || '20 минут';
  const isResultDialogue = formData.format === 'dialogue' || result?.meta?.format === 'dialogue';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ЛЕВАЯ КОЛОНКА: ФОРМА НАСТРОЕК */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col space-y-6">
        {/* Заголовок и переключатель формата */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-50 text-[#0E9F9A]">
                <Mic className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#102A43]">
                  Сценарий подкаста
                </h2>
                <p className="text-xs text-slate-500">
                  Генерация делового диалога или экспертного монолога
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFillSample}
              className="inline-flex items-center gap-1.5 text-xs text-[#0E9F9A] hover:text-[#0b7f7b] font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Пример</span>
            </button>
          </div>

          {/* ПЕРЕКЛЮЧАТЕЛЬ ФОРМАТА [Диалог] / [Монолог] */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Формат сценария
            </label>
            <div
              role="group"
              aria-label="Выбор формата подкаста"
              className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => handleFormatToggle('dialogue')}
                aria-pressed={isDialogue}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isDialogue
                    ? 'bg-white text-[#102A43] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-[#0E9F9A]" />
                <span>Диалог</span>
              </button>

              <button
                type="button"
                onClick={() => handleFormatToggle('monologue')}
                aria-pressed={!isDialogue}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isDialogue
                    ? 'bg-white text-[#102A43] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-4 h-4 text-[#0E9F9A]" />
                <span>Монолог</span>
              </button>
            </div>
          </div>
        </div>

        {/* ФОРМА */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          {/* Сфера деятельности */}
          <div>
            <label
              htmlFor="podcast-industry"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Сфера бизнеса
            </label>
            <select
              id="podcast-industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.icon} {ind.label}
                </option>
              ))}
            </select>
          </div>

          {/* Тема выпуска */}
          <div>
            <label
              htmlFor="podcast-topic"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Тема выпуска <span className="text-rose-500">*</span>
            </label>
            <input
              id="podcast-topic"
              name="topic"
              type="text"
              required
              placeholder="Например: Внедрение автоматизации в финотдел"
              value={formData.topic}
              onChange={handleChange}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
            />
          </div>

          {/* Поля в зависимости от формата */}
          {isDialogue ? (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Участники диалога
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="podcast-hostName"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Ведущий
                  </label>
                  <input
                    id="podcast-hostName"
                    name="hostName"
                    type="text"
                    placeholder="Анна"
                    value={formData.hostName || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="podcast-guestName"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Гость
                  </label>
                  <input
                    id="podcast-guestName"
                    name="guestName"
                    type="text"
                    placeholder="Иван Смирнов"
                    value={formData.guestName || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="podcast-guestPosition"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Должность гостя
                  </label>
                  <input
                    id="podcast-guestPosition"
                    name="guestPosition"
                    type="text"
                    placeholder="Финансовый директор"
                    value={formData.guestPosition || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="podcast-guestCompany"
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Компания гостя
                    </label>
                    {brandVoice.companyName && formData.guestCompany !== brandVoice.companyName && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, guestCompany: brandVoice.companyName }))}
                        className="text-[11px] text-[#0E9F9A] hover:underline cursor-pointer"
                        title="Вставить название компании из профиля"
                      >
                        Из профиля
                      </button>
                    )}
                  </div>
                  <input
                    id="podcast-guestCompany"
                    name="guestCompany"
                    type="text"
                    placeholder={brandVoice.companyName || "Ромашка"}
                    value={formData.guestCompany || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Спикер выпуска
              </span>

              <div>
                <label
                  htmlFor="podcast-speakerName"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Имя спикера
                </label>
                <input
                  id="podcast-speakerName"
                  name="speakerName"
                  type="text"
                  placeholder="Алексей Мельников"
                  value={formData.speakerName || ''}
                  onChange={handleChange}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="podcast-guestPosition-mono"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Роль / статус
                  </label>
                  <input
                    id="podcast-guestPosition-mono"
                    name="guestPosition"
                    type="text"
                    placeholder="Эксперт по сделкам"
                    value={formData.guestPosition || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="podcast-guestCompany-mono"
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Компания / проект
                    </label>
                    {brandVoice.companyName && formData.guestCompany !== brandVoice.companyName && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, guestCompany: brandVoice.companyName }))}
                        className="text-[11px] text-[#0E9F9A] hover:underline cursor-pointer"
                        title="Вставить название компании из профиля"
                      >
                        Из профиля ({brandVoice.companyName})
                      </button>
                    )}
                  </div>
                  <input
                    id="podcast-guestCompany-mono"
                    name="guestCompany"
                    type="text"
                    placeholder={brandVoice.companyName || "LegalLab"}
                    value={formData.guestCompany || ''}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ключевой инсайт */}
          <div>
            <label
              htmlFor="podcast-keyInsight"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Ключевой инсайт / главная мысль
            </label>
            <textarea
              id="podcast-keyInsight"
              name="keyInsight"
              rows={2}
              placeholder="Например: Автоматизация сохраняет 40 часов в месяц и исключает ручные ошибки"
              value={formData.keyInsight}
              onChange={handleChange}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
            />
          </div>

          {/* Хронометраж и Бизнес-цель */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="podcast-duration"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Хронометраж
              </label>
              <select
                id="podcast-duration"
                name="targetDuration"
                value={formData.targetDuration}
                onChange={handleChange}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
              >
                {DURATION_OPTIONS.map((dur) => (
                  <option key={dur} value={dur}>
                    {dur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="podcast-goal"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Бизнес-цель
              </label>
              <select
                id="podcast-goal"
                name="businessGoal"
                value={formData.businessGoal}
                onChange={handleChange}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
              >
                {GOAL_OPTIONS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Кнопки действий формы */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Генерация сценария...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Сгенерировать сценарий</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              title="Сбросить форму"
              className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* ПРАВАЯ КОЛОНКА: РЕЗУЛЬТАТ */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {result ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
            {/* Шапка результата с компактным MetaBadge */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1 max-w-md">
                <span className="text-[11px] font-bold text-[#0E9F9A] uppercase tracking-wider">
                  {formData.format === 'monologue' || result.meta?.format === 'monologue' ? 'Монолог' : 'Диалог'} • {displayDuration}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#102A43]">
                  {stripMarkdown(result.title)}
                </h3>
              </div>

              {/* MetaBadge: компактный бейдж (Контекст · Тон · Цель) */}
              <MetaBadge
                meta={{
                  context: result.meta?.context || 'B2B',
                  tone: result.meta?.tone || formData.voiceStyle || 'Деловой',
                  goal: result.meta?.goal || formData.businessGoal,
                }}
              />
            </div>

            {/* БЛОК ОЗВУЧКИ ЧЕРЕЗ HEYGEN TTS */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-[#0E9F9A]">
                    <Volume2 className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#102A43] block">
                      Озвучка через HeyGen TTS
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Синтез аудио MP3 с возможностью прослушивания и скачивания
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenConfirm}
                  disabled={ttsLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {ttsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Синтез речи (~20 сек)...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 Озвучить через HeyGen</span>
                    </>
                  )}
                </button>
              </div>

              {/* Селектор голосов для формата диалога */}
              {isResultDialogue ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label
                      htmlFor="podcast-heygen-host-voice"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Голос ведущего ({formData.hostName || 'Анна'})
                    </label>
                    <select
                      id="podcast-heygen-host-voice"
                      value={hostVoiceId}
                      onChange={(e) => setHostVoiceId(e.target.value)}
                      disabled={ttsLoading}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                    >
                      {heygenVoices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="podcast-heygen-guest-voice"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Голос гостя ({formData.guestName || 'Гость'})
                    </label>
                    <select
                      id="podcast-heygen-guest-voice"
                      value={guestVoiceId}
                      onChange={(e) => setGuestVoiceId(e.target.value)}
                      disabled={ttsLoading}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                    >
                      {heygenVoices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="pt-1 max-w-sm">
                  <label
                    htmlFor="podcast-heygen-speaker-voice"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Голос спикера ({formData.speakerName || 'Спикер'})
                  </label>
                  <select
                    id="podcast-heygen-speaker-voice"
                    value={hostVoiceId}
                    onChange={(e) => setHostVoiceId(e.target.value)}
                    disabled={ttsLoading}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A]/30 focus:border-[#0E9F9A]"
                  >
                    {heygenVoices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Уведомление о стоимости */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Озвучка через HeyGen TTS. Стоимость ~$0.03 за минуту.</span>
              </div>

              {/* Ошибка TTS */}
              {ttsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{ttsError}</span>
                </div>
              )}

              {/* Результат синтеза: Последовательный плеер и список озвученных реплик */}
              {audioTracks.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  {/* Основная панель плеера */}
                  <div className="p-4 bg-gradient-to-r from-teal-50/80 to-slate-50 rounded-xl border border-teal-200/70 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#102A43]">
                          Озвучено реплик: {audioTracks.length}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                          {isResultDialogue ? 'Диалог (2 голоса)' : 'Монолог'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePlayAll}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E9F9A] hover:bg-[#0c8a86] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Пауза</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{currentTrackIndex > 0 ? 'Продолжить' : 'Слушать всё'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadVoiceoverText}
                          title="Скачать весь текст озвучки целиком в формате .txt"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#102A43] border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0E9F9A]" />
                          <span>Скачать текст (.txt)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyVoiceoverText}
                          title="Скопировать весь текст озвучки целиком"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#102A43] border border-slate-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                        >
                          {voiceoverCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Скопировано</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Копировать</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadFullAudio}
                          disabled={isMergingAudio}
                          title="Объединить все фрагменты и скачать всё аудио целиком в один файл"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0E9F9A] border border-teal-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isMergingAudio ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Склейка...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Всё аудио (WAV)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Текущий активный трек */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500">
                            Реплика {currentTrackIndex + 1} из {audioTracks.length}:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              audioTracks[currentTrackIndex]?.isHost
                                ? 'bg-teal-50 text-[#0E9F9A] border border-teal-200/50'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                            }`}
                          >
                            {audioTracks[currentTrackIndex]?.speaker}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handlePrevTrack}
                            disabled={currentTrackIndex === 0}
                            title="Предыдущая реплика"
                            className="p-1.5 text-slate-500 hover:text-[#102A43] disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                          >
                            <SkipBack className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextTrack}
                            disabled={currentTrackIndex === audioTracks.length - 1}
                            title="Следующая реплика"
                            className="p-1.5 text-slate-500 hover:text-[#102A43] disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-2 italic">
                        «{audioTracks[currentTrackIndex]?.text}»
                      </p>

                      {/* Нативный HTML5 аудио-элемент текущего трека с автопереходом */}
                      <audio
                        ref={audioRef}
                        controls
                        src={audioTracks[currentTrackIndex]?.url}
                        onEnded={handleTrackEnded}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="w-full h-9 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Список реплик с отдельными кнопками воспроизведения и скачивания */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {audioTracks.map((track, idx) => {
                      const isCurrent = currentTrackIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                            isCurrent
                              ? 'bg-teal-50/60 border-teal-300 ring-1 ring-teal-300 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => togglePlayTrack(idx)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                isCurrent && isPlaying
                                  ? 'bg-[#0E9F9A] text-white'
                                  : 'bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-[#0E9F9A]'
                              }`}
                              title={isCurrent && isPlaying ? 'Пауза' : 'Слушать'}
                            >
                              {isCurrent && isPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                <span
                                  className={`text-[11px] font-bold ${
                                    track.isHost ? 'text-[#0E9F9A]' : 'text-indigo-600'
                                  }`}
                                >
                                  {track.speaker}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 truncate">{track.text}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadMp3(track.url, idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0E9F9A] text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
                            title="Скачать эту реплику в MP3"
                          >
                            <Download className="w-3 h-3" />
                            <span>MP3</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ДИАЛОГ ПОДТВЕРЖДЕНИЯ СИНТЕЗА РЕЧИ */}
            {showConfirmDialog && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Подтверждение синтеза речи
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Синтез речи займёт ~20 секунд и потратит ~$0.6. Продолжить?
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteHeygenTTS}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0E9F9A] hover:bg-[#0c8a86] rounded-lg shadow-xs cursor-pointer"
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {/* Предупреждение о недостающих данных */}
            {result.missing_data && result.missing_data.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">
                    Не хватило данных для полного контекста:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.missing_data.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ТЕЛО СЦЕНАРИЯ */}
            <div className="space-y-5">
              {/* Вступление (Intro) */}
              <section className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Вступление
                </span>
                {Array.isArray(result.intro) ? (
                  <div className="space-y-2.5">
                    {result.intro.map((rep, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          rep.speaker === formData.hostName || rep.speaker === 'Анна'
                            ? 'bg-teal-50/70 border-teal-200/60 text-[#102A43]'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="font-bold text-[11px] text-[#0E9F9A] mb-1">
                          {rep.speaker}
                        </div>
                        <p>{stripMarkdown(rep.text)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800">
                    {stripMarkdown(result.intro)}
                  </div>
                )}
              </section>

              {/* Основная часть (Script для диалога или Body для монолога) */}
              {result.script && result.script.length > 0 && (
                <section className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Основной диалог ({result.script.length} реплик)
                  </span>
                  <div className="space-y-2.5">
                    {result.script.map((rep, idx) => {
                      const isHost = rep.speaker === formData.hostName || rep.speaker === 'Анна';
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                            isHost
                              ? 'bg-teal-50/40 border-teal-100 text-[#102A43] mr-4'
                              : 'bg-white border-slate-200 text-slate-800 ml-4 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[11px] font-bold ${
                                isHost ? 'text-[#0E9F9A]' : 'text-indigo-600'
                              }`}
                            >
                              {rep.speaker}
                            </span>
                            {rep.cue && (
                              <span className="text-[10px] italic text-slate-400">
                                ({rep.cue})
                              </span>
                            )}
                          </div>
                          <p>{stripMarkdown(rep.text)}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Текст монолога: чистые абзацы без номеров */}
              {result.body && result.body.length > 0 && (
                <section className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Текст монолога ({result.body.length} абзацев)
                  </span>
                  <div className="space-y-3">
                    {result.body.map((para, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800"
                      >
                        <p>{cleanParagraph(para)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Завершение (Outro) */}
              <section className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Завершение и призыв к действию (CTA)
                </span>
                {Array.isArray(result.outro) ? (
                  <div className="space-y-2.5">
                    {result.outro.map((rep, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs leading-relaxed text-slate-800"
                      >
                        <div className="font-bold text-[11px] text-emerald-700 mb-1">
                          {rep.speaker}
                        </div>
                        <p>{stripMarkdown(rep.text)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs leading-relaxed text-slate-800 font-medium">
                    {stripMarkdown(result.outro)}
                  </div>
                )}
              </section>
            </div>

            {/* СТРОКА ЭКСПОРТА */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {copied ? (
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
                onClick={handleDownloadJson}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#0E9F9A]" />
                <span>Скачать .json</span>
              </button>
            </div>

            {/* Переключатель JSON */}
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
          /* Плейсхолдер пустого состояния */
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[420px]">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0E9F9A] flex items-center justify-center">
              <Mic className="w-8 h-8" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-base font-bold text-[#102A43] mb-1">
                Сценарий ещё не создан
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Выберите формат <span className="font-semibold text-slate-700">[Диалог]</span> или <span className="font-semibold text-slate-700">[Монолог]</span>, заполните тему выпуска и нажмите кнопку генерации или используйте кнопку «Пример».
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
