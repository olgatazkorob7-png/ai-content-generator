import React from 'react';
import type { TabType } from '../types';

interface TabItem {
  id: TabType;
  icon: string;
  label: string;
  subtitle: string;
}

const TABS: TabItem[] = [
  { id: 'email', icon: '📧', label: 'Рассылки', subtitle: 'ВОВЛЕЧЕНИЕ' },
  { id: 'podcast', icon: '🎙', label: 'Подкасты', subtitle: 'ЭКСПЕРТНОСТЬ' },
  { id: 'avatar', icon: '🎬', label: 'Видео', subtitle: 'БЫСТРЫЙ ОХВАТ' },
  { id: 'case', icon: '📊', label: 'Кейсы', subtitle: 'ДОВЕРИЕ' },
  { id: 'contentPlan', icon: '📅', label: 'Контент-план', subtitle: 'ПЛАНИРОВАНИЕ' },
];

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

// Компонент переключения вкладок с иконкой, названием и подзаголовком
export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <nav
      role="tablist"
      aria-label="Вкладки типов контента"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border transition-all text-center focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:ring-offset-2 cursor-pointer ${
              isActive
                ? 'bg-[#0E9F9A] text-white border-[#0E9F9A] shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 text-base sm:text-lg font-semibold mb-1">
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase ${
                isActive ? 'text-white/80' : 'text-slate-400'
              }`}
            >
              {tab.subtitle}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
