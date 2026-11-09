import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import { EmailTab } from './components/EmailTab';
import { PodcastTab } from './components/PodcastTab';
import { AvatarTab } from './components/AvatarTab';
import { CaseTab } from './components/CaseTab';
import { ContentPlanTab } from './components/ContentPlanTab';
import { ProposalModal } from './components/ProposalModal';
import { BrandVoiceModal } from './components/BrandVoiceModal';
import type { TabType, EnvHealthResponse, TestLlmResponse, EmailData, PodcastData, AvatarData, CaseData, ProposalData } from './types';

const sampleEmailData: EmailData = {
  industry: 'Юридические услуги',
  companyName: 'Правовой Щит',
  senderName: 'Анна Смирнова',
  clientName: 'Дмитрий',
  clientPosition: 'Генеральный директор',
  clientCompany: 'ООО Технопром',
  product: 'Абонентское юридическое обслуживание',
  keyBenefit: 'Снижение юридических рисков и экономия до 40% на штате юристов',
  keyNumber: 'Экономия 40%',
  businessGoal: 'Возврат клиента',
  tone: 'деловой',
};

const samplePodcastData: PodcastData = {
  format: 'dialogue',
  industry: 'it',
  topic: 'Автоматизация финансовой отчётности',
  hostName: 'Анна',
  guestName: 'Иван',
  guestPosition: 'Финансовый директор',
  guestCompany: 'Ромашка',
  keyInsight: 'Экономия 40 часов в месяц',
  targetDuration: '20 минут',
  businessGoal: 'Прогрев',
};

const sampleAvatarData: AvatarData = {
  industry: 'it',
  product: 'Пакет юридической защиты интеллектуальной собственности',
  targetPain: 'Риск утечки исходного кода или претензий от субподрядчиков',
  avatarRole: 'executive',
  videoFormat: '16:9',
  durationSeconds: 30,
};

const sampleCaseData: CaseData = {
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

const sampleProposalData: ProposalData = {
  companyName: 'Автоматизация БП',
  clientCompany: 'Ромашка',
  clientName: 'Дмитрий',
  clientPosition: 'Финансовый директор',
  service: 'Автоматизация финансовой отчётности',
  problem: 'Ручная сверка данных 40 часов в месяц',
  solution: 'Интеграция 1С с BI-системой, настройка дашбордов',
  scope: 'Интеграция 1С, настройка дашбордов, обучение команды',
  pricing: 'от 250 000 руб.',
  timeline: '4–6 недель',
  terms: 'Оплата 50/50, гарантия 6 месяцев',
  contact: 'ivan@company.ru, +7 999 123-45-67',
};

export default function App() {
  // Состояние активной вкладки (по умолчанию 'email')
  const [activeTab, setActiveTab] = useState<TabType>('email');

  // Состояние модального окна создания КП (Part 9B)
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);

  // Состояние модального окна профиля компании
  const [showBrandVoiceModal, setShowBrandVoiceModal] = useState<boolean>(false);

  // Состояние панели отладки из Part 1
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [envData, setEnvData] = useState<EnvHealthResponse | null>(null);
  const [llmData, setLlmData] = useState<TestLlmResponse | null>(null);
  const [emailTestData, setEmailTestData] = useState<any>(null);
  const [podcastTestData, setPodcastTestData] = useState<any>(null);
  const [avatarTestData, setAvatarTestData] = useState<any>(null);
  const [caseTestData, setCaseTestData] = useState<any>(null);
  const [proposalTestData, setProposalTestData] = useState<any>(null);
  const [loadingEnv, setLoadingEnv] = useState<boolean>(false);
  const [loadingLlm, setLoadingLlm] = useState<boolean>(false);
  const [loadingEmailTest, setLoadingEmailTest] = useState<boolean>(false);
  const [loadingPodcastTest, setLoadingPodcastTest] = useState<boolean>(false);
  const [loadingAvatarTest, setLoadingAvatarTest] = useState<boolean>(false);
  const [loadingCaseTest, setLoadingCaseTest] = useState<boolean>(false);
  const [loadingProposalTest, setLoadingProposalTest] = useState<boolean>(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [emailTestError, setEmailTestError] = useState<string | null>(null);
  const [podcastTestError, setPodcastTestError] = useState<string | null>(null);
  const [avatarTestError, setAvatarTestError] = useState<string | null>(null);
  const [caseTestError, setCaseTestError] = useState<string | null>(null);
  const [proposalTestError, setProposalTestError] = useState<string | null>(null);

  // Проверка секретов в окружении
  const handleCheckEnv = async () => {
    setLoadingEnv(true);
    setEnvError(null);
    try {
      const res = await fetch('/api/health/env');
      if (!res.ok) {
        throw new Error(`Ошибка сервера: ${res.status}`);
      }
      const data: EnvHealthResponse = await res.json();
      setEnvData(data);
    } catch (err: any) {
      setEnvError(err?.message || 'Не удалось проверить секреты');
      setEnvData(null);
    } finally {
      setLoadingEnv(false);
    }
  };

  // Проверка генерации через LLM
  const handleCheckLlm = async () => {
    setLoadingLlm(true);
    setLlmError(null);
    try {
      const res = await fetch('/api/test-llm');
      const data: TestLlmResponse = await res.json();
      setLlmData(data);
      if (data.error) {
        setLlmError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к LLM';
      setLlmError(msg);
      setLlmData({ error: msg });
    } finally {
      setLoadingLlm(false);
    }
  };

  // Проверка генерации email (Part 5A)
  const handleTestEmail = async () => {
    setLoadingEmailTest(true);
    setEmailTestError(null);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleEmailData),
      });
      const data = await res.json();
      setEmailTestData(data);
      if (!data.success) {
        setEmailTestError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к /api/generate-email';
      setEmailTestError(msg);
      setEmailTestData({ success: false, error: msg });
    } finally {
      setLoadingEmailTest(false);
    }
  };

  // Проверка генерации подкаста (Part 6A)
  const handleTestPodcast = async () => {
    setLoadingPodcastTest(true);
    setPodcastTestError(null);
    try {
      const res = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePodcastData),
      });
      const data = await res.json();
      setPodcastTestData(data);
      if (!data.success) {
        setPodcastTestError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к /api/generate-podcast';
      setPodcastTestError(msg);
      setPodcastTestData({ success: false, error: msg });
    } finally {
      setLoadingPodcastTest(false);
    }
  };

  // Проверка генерации текста для аватара (Part 7B)
  const handleTestAvatar = async () => {
    setLoadingAvatarTest(true);
    setAvatarTestError(null);
    try {
      const res = await fetch('/api/generate-avatar-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleAvatarData),
      });
      const data = await res.json();
      setAvatarTestData(data);
      if (!data.success) {
        setAvatarTestError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к /api/generate-avatar-script';
      setAvatarTestError(msg);
      setAvatarTestData({ success: false, error: msg });
    } finally {
      setLoadingAvatarTest(false);
    }
  };

  // Проверка генерации кейса (Part 8A)
  const handleTestCase = async () => {
    setLoadingCaseTest(true);
    setCaseTestError(null);
    try {
      const res = await fetch('/api/generate-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleCaseData),
      });
      const data = await res.json();
      setCaseTestData(data);
      if (!data.success) {
        setCaseTestError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к /api/generate-case';
      setCaseTestError(msg);
      setCaseTestData({ success: false, error: msg });
    } finally {
      setLoadingCaseTest(false);
    }
  };

  // Проверка генерации КП (Part 9A)
  const handleTestProposal = async () => {
    setLoadingProposalTest(true);
    setProposalTestError(null);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleProposalData),
      });
      const data = await res.json();
      setProposalTestData(data);
      if (!data.success) {
        setProposalTestError(data.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ошибка запроса к /api/generate-proposal';
      setProposalTestError(msg);
      setProposalTestData({ success: false, error: msg });
    } finally {
      setLoadingProposalTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#102A43] flex flex-col font-sans">
      {/* Шапка приложения */}
      <Header
        onOpenProposal={() => setShowProposalModal(true)}
        onOpenBrandVoice={() => setShowBrandVoiceModal(true)}
      />

      {/* Модальное окно создания КП (Part 9B) */}
      <ProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
      />

      {/* Модальное окно профиля компании */}
      <BrandVoiceModal
        isOpen={showBrandVoiceModal}
        onClose={() => setShowBrandVoiceModal(false)}
      />

      {/* Основной контент */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Панель вкладок */}
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Содержимое активной вкладки */}
        {activeTab === 'email' && <EmailTab />}

        {activeTab === 'podcast' && <PodcastTab />}

        {activeTab === 'avatar' && <AvatarTab />}

        {activeTab === 'case' && <CaseTab />}

        {activeTab === 'contentPlan' && <ContentPlanTab />}
      </main>

      {/* Нижняя панель отладки из Part 1 (сворачиваемая) */}
      <footer className="w-full border-t border-slate-200 bg-white/80 backdrop-blur-xs py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-[#102A43] py-1 cursor-pointer focus:outline-none"
            aria-expanded={isDebugOpen}
            aria-controls="debug-panel-content"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0E9F9A]"></span>
              <span>Панель отладки и проверки API (Part 1)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>{isDebugOpen ? 'Скрыть' : 'Показать'}</span>
              {isDebugOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isDebugOpen && (
            <div id="debug-panel-content" className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCheckEnv}
                  disabled={loadingEnv}
                  aria-label="Проверить секреты окружения"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E9F9A] hover:bg-[#0c8a86] active:bg-[#0a7572] text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingEnv ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Проверить секреты</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckLlm}
                  disabled={loadingLlm}
                  aria-label="Проверить подключение к LLM"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#102A43] hover:bg-[#1a3b5c] active:bg-[#0a1b2c] text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingLlm ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Проверить LLM</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={loadingEmailTest}
                  aria-label="Проверить генерацию email (Part 5A)"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingEmailTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>📧</span>
                  )}
                  <span>Test email</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPodcast}
                  disabled={loadingPodcastTest}
                  aria-label="Проверить генерацию подкаста (Part 6A)"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingPodcastTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>🎙</span>
                  )}
                  <span>Test podcast</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestAvatar}
                  disabled={loadingAvatarTest}
                  aria-label="Проверить генерацию текста аватара (Part 7B)"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingAvatarTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>👤</span>
                  )}
                  <span>Test avatar script</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestCase}
                  disabled={loadingCaseTest}
                  aria-label="Проверить генерацию кейса (Part 8A)"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingCaseTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>📊</span>
                  )}
                  <span>Test case</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestProposal}
                  disabled={loadingProposalTest}
                  aria-label="Проверить генерацию КП (Part 9A)"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {loadingProposalTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>📄</span>
                  )}
                  <span>Test proposal</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>GET /api/health/env</span>
                    {envData && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {envError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {envData !== null
                      ? JSON.stringify(envData, null, 2)
                      : envError
                      ? JSON.stringify({ error: envError }, null, 2)
                      : '// Нажмите "Проверить секреты"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>GET /api/test-llm</span>
                    {llmData && !llmData.error && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {llmError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {llmData !== null
                      ? JSON.stringify(llmData, null, 2)
                      : llmError
                      ? JSON.stringify({ error: llmError }, null, 2)
                      : '// Нажмите "Проверить LLM"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>POST /api/generate-email</span>
                    {emailTestData && emailTestData.success && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {emailTestError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {emailTestData !== null
                      ? JSON.stringify(emailTestData, null, 2)
                      : emailTestError
                      ? JSON.stringify({ error: emailTestError }, null, 2)
                      : '// Нажмите "Test email"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>POST /api/generate-podcast</span>
                    {podcastTestData && podcastTestData.success && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {podcastTestError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {podcastTestData !== null
                      ? JSON.stringify(podcastTestData, null, 2)
                      : podcastTestError
                      ? JSON.stringify({ error: podcastTestError }, null, 2)
                      : '// Нажмите "Test podcast"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>POST /api/generate-avatar-script</span>
                    {avatarTestData && avatarTestData.success && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {avatarTestError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {avatarTestData !== null
                      ? JSON.stringify(avatarTestData, null, 2)
                      : avatarTestError
                      ? JSON.stringify({ error: avatarTestError }, null, 2)
                      : '// Нажмите "Test avatar script"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>POST /api/generate-case</span>
                    {caseTestData && caseTestData.success && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {caseTestError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {caseTestData !== null
                      ? JSON.stringify(caseTestData, null, 2)
                      : caseTestError
                      ? JSON.stringify({ error: caseTestError }, null, 2)
                      : '// Нажмите "Test case"'}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>POST /api/generate-proposal</span>
                    {proposalTestData && proposalTestData.success && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {proposalTestError && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </div>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48">
                    {proposalTestData !== null
                      ? JSON.stringify(proposalTestData, null, 2)
                      : proposalTestError
                      ? JSON.stringify({ error: proposalTestError }, null, 2)
                      : '// Нажмите "Test proposal"'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
