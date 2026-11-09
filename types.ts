// Типы вкладок и общие интерфейсы приложения

export type TabType = 'email' | 'podcast' | 'avatar' | 'case' | 'contentPlan';

export interface BrandVoice {
  version: 1;               // версия схемы, для будущих миграций
  companyName: string;      // название компании
  industry: string;         // отрасль
  icp: string;              // идеальный клиент (ICP)
  painPoints: string;       // главные боли клиента
  uvp: string;              // уникальное предложение (УТП)
  tone: string;             // tone of voice
  bannedWords: string;      // запрещённые слова через запятую
  goodExamples: string;     // примеры хорошего контента
  extraNotes: string;       // доп. заметки
  updatedAt: string;        // ISO timestamp последнего сохранения
}

export interface EnvHealthResponse {
  hasOpenAIKey: boolean;
  hasBaseUrl: boolean;
  hasModel: boolean;
  hasHeyGenKey: boolean;
}

export interface TestLlmResponse {
  reply?: string;
  error?: string;
}

export interface GenerationResult {
  id: string;
  type: 'email' | 'podcast' | 'avatar' | 'case' | 'proposal';
  content: string;
  timestamp: number;
}

export interface EmailData {
  industry: string;
  companyName: string;
  senderName: string;
  clientName: string;
  clientPosition?: string;
  clientCompany?: string;
  product: string;
  keyBenefit: string;
  keyNumber?: string;
  businessGoal: string;
  tone: string;
}

export interface PodcastData {
  format: 'dialogue' | 'monologue';
  industry: string;
  topic: string;
  hostName?: string;
  speakerName?: string;
  guestName?: string;
  guestPosition?: string;
  guestCompany?: string;
  keyInsight: string;
  targetDuration: string;
  businessGoal: string;
  voiceStyle?: string;
}

export interface AvatarData {
  industry: string;
  companyName?: string;
  product: string;
  targetPain: string;
  avatarRole: string;
  videoFormat: '16:9' | 'vertical_9_16';
  durationSeconds: number;
}

export interface CaseData {
  industry: string;
  companyName: string;
  clientName: string;
  clientIndustry: string;
  challenge: string;
  solution: string;
  results: string;
  duration?: string;
  quote?: string;
  targetAudience: string;
}

export interface ProposalData {
  companyName: string;
  clientCompany: string;
  clientName: string;
  clientPosition?: string;
  service: string;
  problem: string;
  solution: string;
  scope: string;
  pricing: string;
  timeline?: string;
  terms?: string;
  contact: string;
}

export interface ContentPlanRequest {
  topic: string;
  days: number;
  postsPerDay: number;
  tone: string;
  audience: string;
  goal: string;
}

export type ContentPlanPostType =
  | 'case' | 'insight' | 'question' | 'poll' | 'announcement' | 'story';

export interface ContentPlanPost {
  day: number;
  date_hint: string;
  time_hint: string;
  content_type: ContentPlanPostType;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
}

export interface ContentPlanResponse {
  plan_title: string;
  posts: ContentPlanPost[];
}

export interface SavedPlan {
  id: string;                    // уникальный: Date.now().toString()
  createdAt: string;             // ISO timestamp
  plan_title: string;
  posts: ContentPlanPost[];
  request: ContentPlanRequest;   // параметры, с которыми генерировали
  publishedPosts: number[];      // индексы опубликованных постов
}
