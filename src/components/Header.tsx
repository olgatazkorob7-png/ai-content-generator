import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { getBrandVoice, isBrandVoiceFilled } from '../lib/brandVoice';

interface HeaderProps {
  onOpenProposal?: () => void;
  onCreateKp?: () => void;
  onOpenBrandVoice?: () => void;
}

export default function Header({ onOpenProposal, onCreateKp, onOpenBrandVoice }: HeaderProps) {
  const handleClick = onOpenProposal || onCreateKp || (() => {});

  const [isProfileFilled, setIsProfileFilled] = useState<boolean>(() =>
    isBrandVoiceFilled(getBrandVoice())
  );

  useEffect(() => {
    const check = () => setIsProfileFilled(isBrandVoiceFilled(getBrandVoice()));
    check();
    window.addEventListener('focus', check);
    window.addEventListener('storage', check);
    window.addEventListener('aicm:brand-voice-changed', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', check);
      window.removeEventListener('aicm:brand-voice-changed', check);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Логотип */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center font-bold text-sm shrink-0">
            AI
          </div>
          <span className="text-base sm:text-xl font-bold text-[#102A43] tracking-tight truncate">
            AI Контент-Мейкер
          </span>
        </div>

        {/* Кнопки справа */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Профиль — inline-стили, чтобы 100% работало */}
          <button
            type="button"
            onClick={onOpenBrandVoice}
            title="Профиль компании"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid ' + (isProfileFilled ? '#cbd5e1' : '#f97316'),
              background: isProfileFilled ? '#ffffff' : '#f97316',
              color: isProfileFilled ? '#334155' : '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Building2
              style={{
                width: '14px',
                height: '14px',
                color: isProfileFilled ? '#475569' : '#ffffff',
              }}
            />
            <span style={{ color: isProfileFilled ? '#334155' : '#ffffff' }}>
              Профиль
            </span>
          </button>

          {/* Создать КП */}
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0E9F9A] text-[#0E9F9A] hover:bg-[#0E9F9A]/5 active:bg-[#0E9F9A]/10 font-medium text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:ring-offset-2 cursor-pointer shrink-0"
            aria-label="Создать коммерческое предложение"
          >
            <span>📄</span>
            <span>Создать КП</span>
          </button>

        </div>
      </div>
    </header>
  );
}