import type { EmailData } from '../types';

export const INDUSTRIES = [
  { id: 'services', label: 'Услуги', icon: '💼' },
  { id: 'it', label: 'IT & SaaS', icon: '💻' },
  { id: 'lawyers', label: 'Юристы', icon: '⚖️' },
  { id: 'marketing', label: 'Маркетинг', icon: '📈' },
  { id: 'education', label: 'Обучение', icon: '🎓' },
];

export const BUSINESS_GOALS = [
  'Запись на консультацию',
  'Отправка КП',
  'Возврат клиента',
  'Вебинар',
  'Анонс услуги',
];

export const INDUSTRY_PRESETS: Record<string, Partial<EmailData>> = {
  services: {
    companyName: 'КонсалтПро B2B',
    product: 'Экспресс-аудит операционных процессов',
    keyBenefit: 'Сокращение издержек на 30%',
    keyNumber: '30%',
  },
  it: {
    companyName: 'DevStack Solutions',
    product: 'Разработка B2B SaaS систем',
    keyBenefit: 'Ускорение Time-to-Market в 2 раза',
    keyNumber: '2x',
  },
  lawyers: {
    companyName: 'Правовой Щит',
    product: 'Абонентское юридическое обслуживание',
    keyBenefit: 'Снижение юридических рисков',
    keyNumber: '40%',
  },
  marketing: {
    companyName: 'LeadFlow Agency',
    product: 'Performance-маркетинг для B2B',
    keyBenefit: 'Стабильный поток лидов от ЛПР',
    keyNumber: '3x',
  },
  education: {
    companyName: 'B2B Sales Academy',
    product: 'Корпоративное обучение продажам',
    keyBenefit: 'Рост конверсии отдела продаж',
    keyNumber: '25%',
  },
};
