import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateJSON } from './src/lib/llm.ts';
import { buildEmailPrompt } from './prompts/email.ts';
import { buildPodcastPrompt } from './prompts/podcast.ts';
import { buildAvatarPrompt } from './prompts/avatar.ts';
import { buildCasePrompt } from './prompts/case.ts';
import { buildProposalPrompt } from './prompts/proposal.ts';
import { buildContentPlanPrompt } from './prompts/contentPlan.ts';
import { buildBrandVoiceContext } from './src/lib/brandVoice.ts';
import type { EmailData, PodcastData, AvatarData, CaseData, ProposalData, ContentPlanRequest, BrandVoice } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
  });

  // TASK 1: Проверка наличия секретов
  app.get('/api/health/env', (_req, res) => {
    res.json({
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasBaseUrl: !!process.env.OPENAI_BASE_URL,
      hasModel: !!process.env.KODIKROUTER_MODEL,
      hasHeyGenKey: !!process.env.HEYGEN_API_KEY,
      hasTelegram: !!(process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID),
      hasVK: !!(process.env.VK_ACCESS_TOKEN && process.env.VK_OWNER_ID),
    });
  });

  // TASK 2: Тестирование подключения к LLM через OpenAI SDK
  app.get('/api/test-llm', async (_req, res) => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      });

      const response = await openai.chat.completions.create({
        model: process.env.KODIKROUTER_MODEL || '',
        messages: [{ role: 'user', content: 'Скажи привет одним словом' }],
      });

      res.json({
        reply: response.choices[0]?.message?.content || '',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Неизвестная ошибка LLM',
      });
    }
  });

  // Part 5A: Генерация email-письма
  app.post('/api/generate-email', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as EmailData & { brandVoiceContext?: string };
    console.log('[API /generate-email] Starting for', data.companyName);

    try {
      const { system, user } = buildEmailPrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.7,
      });

      console.log('[API /generate-email] Success, length:', JSON.stringify(result).length);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-email] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({
          success: false,
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.',
        });
      } else {
        res.status(500).json({
          success: false,
          error: error?.message || 'Не удалось сгенерировать email',
        });
      }
    }
  });

  // Part 6A: Генерация подкаста
  app.post('/api/generate-podcast', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as PodcastData & { brandVoiceContext?: string };
    console.log('[API /generate-podcast] format:', data.format, 'topic:', data.topic);

    try {
      const { system, user } = buildPodcastPrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.85,
      });

      console.log('[API /generate-podcast] Success');
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-podcast] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({
          success: false,
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.',
        });
      } else {
        res.status(500).json({
          success: false,
          error: error?.message || 'Не удалось сгенерировать подкаст',
        });
      }
    }
  });

  // Part 7B: Генерация скрипта для видео-аватара
  app.post('/api/generate-avatar-script', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as AvatarData & { brandVoiceContext?: string };
    console.log('[API /generate-avatar-script] product:', data.product);

    try {
      const { system, user } = buildAvatarPrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.6,
      });

      console.log('[API /generate-avatar-script] Success');
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-avatar-script] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({
          success: false,
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.',
        });
      } else {
        res.status(500).json({
          success: false,
          error: error?.message || 'Не удалось сгенерировать текст для аватара',
        });
      }
    }
  });

  // Part 8A: Генерация клиентского кейса
  app.post('/api/generate-case', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as CaseData & { brandVoiceContext?: string };
    console.log('[API /generate-case] client:', data.clientName);

    try {
      const { system, user } = buildCasePrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.7,
      });

      console.log('[API /generate-case] Success');
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-case] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({
          success: false,
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.',
        });
      } else {
        res.status(500).json({
          success: false,
          error: error?.message || 'Не удалось сгенерировать кейс',
        });
      }
    }
  });

  // Part 9A: Генерация коммерческого предложения
  app.post('/api/generate-proposal', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as ProposalData & { brandVoiceContext?: string };
    console.log('[API /generate-proposal] client:', data.clientCompany);

    try {
      const { system, user } = buildProposalPrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.7,
      });

      console.log('[API /generate-proposal] Success');
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-proposal] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({
          success: false,
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.',
        });
      } else {
        res.status(500).json({
          success: false,
          error: error?.message || 'Не удалось сгенерировать коммерческое предложение',
        });
      }
    }
  });

  app.post('/api/generate-content-plan', async (req, res) => {
    const { brandVoiceContext, ...data } = req.body as 
      ContentPlanRequest & { brandVoiceContext?: string };
    console.log('[API /generate-content-plan] days:', data.days, 
      'postsPerDay:', data.postsPerDay);

    try {
      const { system, user } = buildContentPlanPrompt(data, brandVoiceContext);
      const result = await generateJSON({
        system,
        user,
        temperature: 0.85,
      });
      console.log('[API /generate-content-plan] Success, posts:', 
        (result as any)?.posts?.length);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[API /generate-content-plan] Error:', error);
      if (error?.message === 'LLM did not return valid JSON') {
        res.status(500).json({ success: false, 
          error: 'Модель вернула некорректный ответ. Попробуйте перегенерировать.' });
      } else {
        res.status(500).json({ success: false, 
          error: error?.message || 'Не удалось сгенерировать контент-план' });
      }
    }
  });

  app.post('/api/publish/telegram', upload.single('image'), async (req, res) => {
    try {
      if (!process.env.TG_BOT_TOKEN || !process.env.TG_CHAT_ID) {
        return res.status(500).json({ 
          success: false, 
          error: 'TG_BOT_TOKEN или TG_CHAT_ID не заданы в .env' 
        });
      }

      let data: any = req.body.data;
      if (req.is('multipart/form-data') && typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }

      const customText = req.body.customText;
      const imageBuffer = req.file?.buffer;

      let text = customText;
      if (!text) {
        const tags = (data?.hashtags || []).map((t: string) => 
          t.startsWith('#') ? t : '#' + t).join(' ');
        text = [data?.title, '', data?.body, '', tags, '', data?.cta]
          .filter(Boolean).join('\n').trim();
      }

      let tgRes;

      if (imageBuffer) {
        const form = new FormData();
        form.append('chat_id', process.env.TG_CHAT_ID);
        form.append('caption', text);
        form.append('photo', imageBuffer, {
          filename: req.file?.originalname || 'photo.jpg',
          contentType: req.file?.mimetype,
        });

        tgRes = await axios.post(
          `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendPhoto`,
          form,
          { headers: form.getHeaders(), timeout: 30000 }
        );
      } else {
        tgRes = await axios.post(
          `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
          { 
            chat_id: process.env.TG_CHAT_ID, 
            text, 
            disable_web_page_preview: false 
          },
          { timeout: 15000 }
        );
      }

      if (!tgRes.data?.ok) {
        return res.status(500).json({ 
          success: false, 
          error: tgRes.data?.description || 'Telegram вернул ошибку' 
        });
      }
      res.json({ 
        success: true, 
        message_id: tgRes.data.result?.message_id,
        url: tgRes.data.result?.chat?.username 
          ? `https://t.me/${tgRes.data.result.chat.username}` 
          : null
      });
    } catch (error: any) {
      console.error('[publish/telegram] Error:', error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: error.response?.data?.description || error.message 
      });
    }
  });

  // Публикация ВКонтакте (VK Wall Post)
  app.post('/api/publish/vk', upload.single('image'), async (req, res) => {
    try {
      const accessToken = process.env.VK_ACCESS_TOKEN?.trim();
      const rawOwnerId = process.env.VK_OWNER_ID?.trim();

      if (!accessToken || !rawOwnerId) {
        return res.status(500).json({
          success: false,
          error: 'VK_ACCESS_TOKEN или VK_OWNER_ID не настроены в секретах',
        });
      }

      let data: any = req.body.data;
      if (req.is('multipart/form-data') && typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }

      const customText = req.body.customText;
      const imageBuffer = req.file?.buffer;

      // Очищаем owner_id от возможных '=' или пробелов
      let ownerIdStr = rawOwnerId.replace(/^=+/, '').trim();
      const ownerId = parseInt(ownerIdStr, 10);
      if (isNaN(ownerId)) {
        return res.status(400).json({
          success: false,
          error: `Некорректный VK_OWNER_ID: ${rawOwnerId}`,
        });
      }

      let message = customText;
      if (!message) {
        const tags = (data?.hashtags || [])
          .map((t: string) => (t.startsWith('#') ? t : '#' + t))
          .join(' ');
        message = [data?.title, '', data?.body, '', tags, '', data?.cta]
          .filter(Boolean)
          .join('\n')
          .trim();
      }

      let attachments: string | undefined = undefined;

      // Если прикреплена картинка, выполняем трёхшаговую загрузку в VK
      if (imageBuffer) {
        const groupId = String(Math.abs(ownerId));

        // ШАГ 1. Получаем URL сервера для загрузки фото
        let uploadServerRes;
        try {
          uploadServerRes = await axios.get(
            'https://api.vk.com/method/photos.getWallUploadServer',
            {
              params: {
                group_id: groupId,
                access_token: accessToken,
                v: '5.199',
              },
              timeout: 15000,
            }
          );
        } catch (serverErr: any) {
          console.error('[publish/vk] getWallUploadServer network error:', serverErr.message);
          return res.status(500).json({
            success: false,
            error: 'Ошибка подключения к серверу загрузки VK',
          });
        }

        if (uploadServerRes.data?.error) {
          const err = uploadServerRes.data.error;
          console.error('[publish/vk] getWallUploadServer error:', err);
          if (err.error_code === 27 || err.error_code === 15 || /token/i.test(err.error_msg || '')) {
            return res.status(400).json({
              success: false,
              error: 'Для публикации с картинкой в VK нужен пользовательский токен',
            });
          }
          return res.status(500).json({
            success: false,
            error: err.error_msg || 'Для публикации с картинкой в VK нужен пользовательский токен',
          });
        }

        const uploadUrl = uploadServerRes.data?.response?.upload_url;
        if (!uploadUrl) {
          return res.status(500).json({
            success: false,
            error: 'Не удалось получить upload_url от VK',
          });
        }

        // ШАГ 2. Загружаем фото на полученный upload_url
        const form = new FormData();
        form.append('photo', imageBuffer, {
          filename: req.file?.originalname || 'photo.jpg',
          contentType: req.file?.mimetype || 'image/jpeg',
        });

        const uploadRes = await axios.post(uploadUrl, form, {
          headers: form.getHeaders(),
          timeout: 30000,
        });

        if (uploadRes.data?.error) {
          return res.status(500).json({
            success: false,
            error: `Ошибка загрузки файла в VK: ${uploadRes.data.error}`,
          });
        }

        // ШАГ 3. Сохраняем фото на стене
        const saveRes = await axios.get(
          'https://api.vk.com/method/photos.saveWallPhoto',
          {
            params: {
              group_id: groupId,
              photo: uploadRes.data?.photo,
              server: uploadRes.data?.server,
              hash: uploadRes.data?.hash,
              access_token: accessToken,
              v: '5.199',
            },
            timeout: 15000,
          }
        );

        if (saveRes.data?.error) {
          const err = saveRes.data.error;
          console.error('[publish/vk] saveWallPhoto error:', err);
          return res.status(500).json({
            success: false,
            error: err.error_msg || 'Не удалось сохранить фото на стене VK',
          });
        }

        const photo = saveRes.data?.response?.[0];
        if (photo) {
          attachments = `photo${photo.owner_id}_${photo.id}`;
        }
      }

      // ШАГ 4. Опубликуй пост с вложением
      const postParams: Record<string, string> = {
        owner_id: String(ownerId),
        message,
        from_group: '1',
        access_token: accessToken,
        v: '5.199',
      };

      if (attachments) {
        postParams.attachments = attachments;
      }

      const params = new URLSearchParams(postParams);

      const vkRes = await axios.post(
        'https://api.vk.com/method/wall.post',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        }
      );

      if (vkRes.data?.error) {
        const err = vkRes.data.error;
        console.error('[publish/vk] VK API Error:', err);
        return res.status(500).json({
          success: false,
          error: err.error_msg || `Ошибка VK API #${err.error_code}`,
        });
      }

      const postId = vkRes.data?.response?.post_id;
      // Ссылка на пост ВКонтакте
      // Если owner_id отрицательный, это группа (wall-241789688_123)
      const postUrl = `https://vk.com/wall${ownerId}_${postId}`;

      res.json({
        success: true,
        post_id: postId,
        url: postUrl,
      });
    } catch (error: any) {
      console.error('[publish/vk] Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error?.error_msg || error.message || 'Ошибка при отправке в VK',
      });
    }
  });

  // Part 6E: HeyGen TTS для озвучки подкаста
  app.post('/api/tts/heygen', async (req, res) => {
    try {
      const { text, voiceId } = req.body;

      if (!text || text.length > 5000) {
        return res.status(400).json({
          success: false,
          error: 'Текст пустой или превышает 5000 символов',
        });
      }

      const response = await axios.post(
        'https://api.heygen.com/v3/voices/speech',
        {
          text,
          voice_id: voiceId || '1bd001e7e50f421d891986aad5c8bbd2',
          language: 'ru',
        },
        {
          headers: {
            'X-Api-Key': process.env.HEYGEN_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const audioUrl = response.data?.data?.audio_url;
      if (!audioUrl) {
        return res.status(500).json({
          success: false,
          error: 'HeyGen не вернул audio_url',
        });
      }

      res.json({ success: true, audio_url: audioUrl });
    } catch (error: any) {
      console.error('[TTS HeyGen] Error:', error.response?.data || error.message);
      const rawError = JSON.stringify(error.response?.data || error.message || '');
      let userFriendlyError = error.response?.data?.error || error.response?.data?.message || 'Ошибка синтеза речи';
      if (/voice\s*engine.*not\s*supported/i.test(rawError) || /engine.*not\s*supported/i.test(rawError)) {
        userFriendlyError = 'Этот голос не поддерживает синтез речи. Выберите другой.';
      }
      res.status(400).json({
        success: false,
        error: userFriendlyError,
      });
    }
  });

  // Пакетный синтез речи HeyGen с поддержкой разных голосов для реплик
  app.post('/api/tts/heygen/batch', async (req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'HEYGEN_API_KEY не установлен в .env файле',
        });
      }

      const { replies } = req.body;
      if (!Array.isArray(replies) || replies.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Массив replies обязателен и не должен быть пустым',
        });
      }

      const audio_urls: (string | null)[] = new Array(replies.length).fill(null);
      const concurrency = 2;

      for (let i = 0; i < replies.length; i += concurrency) {
        const batch = replies.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (item, batchIdx) => {
            const index = i + batchIdx;
            const text = typeof item.text === 'string' ? item.text.trim() : '';
            if (!text) return;

            const voice_id = item.voiceId || '1bd001e7e50f421d891986aad5c8bbd2';

            const response = await axios.post(
              'https://api.heygen.com/v3/voices/speech',
              {
                text,
                voice_id,
                language: 'ru',
              },
              {
                headers: {
                  'X-Api-Key': process.env.HEYGEN_API_KEY,
                  'Content-Type': 'application/json',
                },
                timeout: 30000,
              }
            );

            const url = response.data?.data?.audio_url;
            if (!url) {
              throw new Error(`HeyGen не вернул audio_url для реплики #${index + 1}`);
            }
            audio_urls[index] = url;
          })
        );
      }

      const validUrls = audio_urls.filter((u): u is string => Boolean(u));

      res.json({
        success: true,
        audio_urls: validUrls,
      });
    } catch (error: any) {
      console.error('[TTS HeyGen Batch] Error:', error.response?.data || error.message);
      const rawError = JSON.stringify(error.response?.data || error.message || '');
      let userFriendlyError = error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка пакетного синтеза речи';
      if (/voice\s*engine.*not\s*supported/i.test(rawError) || /engine.*not\s*supported/i.test(rawError)) {
        userFriendlyError = 'Этот голос не поддерживает синтез речи. Выберите другой.';
      }
      res.status(400).json({
        success: false,
        error: userFriendlyError,
      });
    }
  });

  // Получение доступных голосов HeyGen
  app.get('/api/heygen/voices', async (req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.json({
          success: true,
          voices: [
            { voice_id: '1bd001e7e50f421d891986aad5c8bbd2', name: 'Анна (Русский)', gender: 'female', language: 'Russian' },
            { voice_id: '2d5b0e6cf3a3460aa9f4604e1a96bc0c', name: 'Иван (Русский)', gender: 'male', language: 'Russian' },
            { voice_id: '077ab11b14f045c0b4954434d130479f', name: 'Дмитрий (Русский)', gender: 'male', language: 'Russian' },
            { voice_id: '131a436e60e64951ab5053081b61030e', name: 'Елена (Русский)', gender: 'female', language: 'Russian' },
          ],
        });
      }

      const engine = typeof req.query.engine === 'string' ? req.query.engine : undefined;
      const params: Record<string, string> = {};
      if (engine) {
        params.engine = engine;
      }

      const response = await axios.get('https://api.heygen.com/v2/voices', {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY,
        },
        params,
        timeout: 10000,
      });

      const formatVoice = (v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        language: v.language || 'Unknown',
        gender: v.gender || 'unknown',
        preview_audio_url: v.preview_audio || v.preview_audio_url || null,
      });

      let allVoices = response.data?.data?.voices || [];
      let ruVoices = allVoices.filter((v: any) => {
        const lang = (v.language || '').toLowerCase();
        return lang.includes('ru') || lang.includes('russian');
      });

      // Если при фильтре по engine найден только 1 голос или 0 — снимаем фильтр engine, чтобы дать пользователю полноценный выбор
      if (engine && ruVoices.length <= 1) {
        try {
          const fallbackRes = await axios.get('https://api.heygen.com/v2/voices', {
            headers: {
              'X-Api-Key': process.env.HEYGEN_API_KEY,
            },
            timeout: 10000,
          });
          const fallbackAll = fallbackRes.data?.data?.voices || [];
          const fallbackRu = fallbackAll.filter((v: any) => {
            const lang = (v.language || '').toLowerCase();
            return lang.includes('ru') || lang.includes('russian');
          });
          if (fallbackRu.length > ruVoices.length) {
            ruVoices = fallbackRu;
            allVoices = fallbackAll;
          }
        } catch {
          // Игнорируем ошибку фоллбэка
        }
      }

      const enVoices = allVoices.filter((v: any) => {
        const lang = (v.language || '').toLowerCase();
        return lang.includes('en') || lang.includes('english');
      });

      // Возвращаем русские голоса первыми (для совместимости с PodcastTab), затем популярные английские голоса
      const combined = [
        ...ruVoices.map(formatVoice),
        ...enVoices.slice(0, 50).map(formatVoice),
      ];

      const resultVoices = combined.length > 0 ? combined : allVoices.slice(0, 30).map(formatVoice);
      const finalVoices = resultVoices.length > 0 ? resultVoices : [
        { voice_id: '1bd001e7e50f421d891986aad5c8bbd2', name: 'Анна (Русский)', gender: 'female', language: 'Russian', preview_audio_url: null },
        { voice_id: '2d5b0e6cf3a3460aa9f4604e1a96bc0c', name: 'Иван (Русский)', gender: 'male', language: 'Russian', preview_audio_url: null },
      ];
      res.json({
        success: true,
        voices: finalVoices,
        data: finalVoices,
      });
    } catch (error: any) {
      console.warn('[HeyGen Voices] Fallback to standard Russian voices:', error.message);
      const fallbackList = [
        { voice_id: '1bd001e7e50f421d891986aad5c8bbd2', name: 'Анна (Русский)', gender: 'female', language: 'Russian' },
        { voice_id: '2d5b0e6cf3a3460aa9f4604e1a96bc0c', name: 'Иван (Русский)', gender: 'male', language: 'Russian' },
        { voice_id: '077ab11b14f045c0b4954434d130479f', name: 'Дмитрий (Русский)', gender: 'male', language: 'Russian' },
        { voice_id: '131a436e60e64951ab5053081b61030e', name: 'Елена (Русский)', gender: 'female', language: 'Russian' },
      ];
      res.json({
        success: true,
        voices: fallbackList,
        data: fallbackList,
      });
    }
  });

  // Получение аватаров HeyGen (Part 7A)
  app.get('/api/heygen/avatars', async (_req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'HEYGEN_API_KEY не установлен в .env файле',
        });
      }

      const response = await axios.get('https://api.heygen.com/v3/avatars?limit=20', {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY,
        },
        timeout: 15000,
      });

      const rawAvatars = response.data?.data || [];
      console.log('[API /heygen/avatars] First RAW avatar from HeyGen:', JSON.stringify(rawAvatars[0], null, 2));
      const data = rawAvatars.map((item: any) => ({
        id: item.id || item.avatar_group_id,
        name: item.name,
        preview_image_url: item.preview_image_url,
        looks_count: item.looks_count ?? 1,
        gender: item.gender,
        default_voice_id: item.default_voice_id,
      }));

      console.log('[API /heygen/avatars] Fetched', data.length, 'avatars');

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[API /heygen/avatars] Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка загрузки аватаров',
      });
    }
  });

  // Получение образов аватара (looks) HeyGen
  app.get('/api/heygen/avatar-looks', async (req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'HEYGEN_API_KEY не установлен в .env файле',
        });
      }

      const groupId = req.query.group_id as string;
      if (!groupId) {
        return res.status(400).json({
          success: false,
          error: 'Параметр group_id обязателен',
        });
      }

      const response = await axios.get(`https://api.heygen.com/v3/avatars/looks?group_id=${encodeURIComponent(groupId)}`, {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY,
        },
        timeout: 15000,
      });

      const rawLooks = response.data?.data || response.data || [];
      const data = (Array.isArray(rawLooks) ? rawLooks : []).map((item: any) => ({
        id: item.id,
        name: item.name,
        preview_image_url: item.preview_image_url,
        default_voice_id: item.default_voice_id,
        gender: item.gender,
      }));

      console.log(`[API /heygen/avatar-looks] Fetched ${data.length} looks for group ${groupId}`);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[API /heygen/avatar-looks] Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка загрузки образов аватара',
      });
    }
  });

  // Part 7E: Создание видео-аватара HeyGen (экономный режим: avatar_iii)
  app.post('/api/heygen/create-video', async (req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'HEYGEN_API_KEY не установлен в .env файле',
        });
      }

      const { avatarId, voiceId, text, aspectRatio } = req.body;

      if (!avatarId || !text) {
        return res.status(400).json({
          success: false,
          error: 'Поля avatarId и text обязательны',
        });
      }

      const payload = {
        type: 'avatar',
        avatar_id: avatarId,
        aspect_ratio: aspectRatio || '16:9',
        script: text,
        voice_id: voiceId,
        engine: { type: 'avatar_iii' },
      };

      console.log('[HeyGen Create Video] Sending request to HeyGen API...', {
        avatar_id: avatarId,
        voice_id: voiceId,
        aspect_ratio: aspectRatio,
        text_length: text.length,
      });

      const response = await axios.post('https://api.heygen.com/v3/videos', payload, {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const videoId =
        response.data?.data?.video_id ||
        response.data?.video_id ||
        response.data?.data?.id ||
        response.data?.id;

      if (!videoId) {
        console.error('[HeyGen Create Video] Missing video_id in response:', response.data);
        return res.status(500).json({
          success: false,
          error: 'HeyGen не вернул video_id',
        });
      }

      console.log('[HeyGen Create Video] Video task created with ID:', videoId);

      res.json({
        success: true,
        video_id: videoId,
      });
    } catch (error: any) {
      console.error('[HeyGen Create Video] Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка создания видео',
      });
    }
  });

  // Part 7E: Проверка статуса видео-аватара HeyGen
  app.get('/api/heygen/video-status/:videoId', async (req, res) => {
    try {
      if (!process.env.HEYGEN_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'HEYGEN_API_KEY не установлен в .env файле',
        });
      }

      const { videoId } = req.params;
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'videoId обязателен',
        });
      }

      const response = await axios.get(`https://api.heygen.com/v3/videos/${videoId}`, {
        headers: {
          'X-Api-Key': process.env.HEYGEN_API_KEY,
        },
        timeout: 15000,
      });

      const data = response.data?.data || response.data || {};
      const rawStatus = String(data.status || '').toLowerCase();
      let status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';

      if (rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'success') {
        status = 'completed';
      } else if (rawStatus === 'failed' || rawStatus === 'error') {
        status = 'failed';
      } else if (rawStatus === 'pending' || rawStatus === 'waiting' || rawStatus === 'queued') {
        status = 'pending';
      } else {
        status = 'processing';
      }

      const video_url = data.video_url || data.url || null;
      const errorMsg = data.error || (status === 'failed' ? 'Ошибка обработки видео на стороне HeyGen' : null);

      res.json({
        success: true,
        status,
        video_url,
        error: errorMsg,
      });
    } catch (error: any) {
      console.error('[HeyGen Video Status] Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Ошибка получения статуса видео',
      });
    }
  });

  // Проксирование скачивания аудио для корректного Content-Disposition attachment
  app.get('/api/download-audio', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'URL обязателен' });
      }

      // Разрешаем HeyGen домены
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ success: false, error: 'Некорректный URL' });
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed =
        hostname.endsWith('heygen.ai') ||
        hostname.endsWith('heygen.com') ||
        url.startsWith('https://files.heygen.ai/') ||
        url.startsWith('https://resource.heygen.ai/') ||
        url.startsWith('https://resource2.heygen.ai/');

      if (!isAllowed) {
        return res.status(403).json({ success: false, error: 'Недопустимый домен' });
      }

      const headers: Record<string, string> = {};
      if (process.env.HEYGEN_API_KEY) {
        headers['X-Api-Key'] = process.env.HEYGEN_API_KEY;
      }

      const audioRes = await axios.get(url, {
        responseType: 'stream',
        headers,
        timeout: 30000,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="podcast-${Date.now()}.mp3"`
      );

      audioRes.data.pipe(res);
    } catch (error: any) {
      console.error('[download-audio] Error:', error.message);
      res.status(500).json({ success: false, error: 'Ошибка скачивания' });
    }
  });

  // Интеграция с Vite (middleware в режиме разработки, статика в продакшене)
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
  });
}

startServer();
