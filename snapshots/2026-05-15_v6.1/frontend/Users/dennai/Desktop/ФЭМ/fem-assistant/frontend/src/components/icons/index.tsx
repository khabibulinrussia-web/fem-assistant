'use client';

/**
 * ERP Ассистент — собственные иконки
 * Все в геометрическом стиле. Цвета настраиваются через className или style.
 */

type IconProps = {
  size?: number;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
};

// 1. Дашборд: ромб + линия графика вверх
export function IconDashboard({ size = 24, className, color = '#60a5fa', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
      <polyline points="7,13 10,10 13,13 17,8" />
    </svg>
  );
}

// 2. Мой бизнес: дом
export function IconBusiness({ size = 24, className, color = '#94a3b8', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
    </svg>
  );
}

// 3. Идея: ромб + лампочка внутри
export function IconIdea({ size = 24, className, color = '#a78bfa', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" opacity="0.3" />
      <path d="M12 6a5 5 0 00-5 5c0 2.5 1.5 4 3 5.5V18h4v-1.5c1.5-1.5 3-3 3-5.5a5 5 0 00-5-5z" />
      <line x1="10.5" y1="18" x2="13.5" y2="18" />
      <line x1="12" y1="6" x2="12" y2="8" />
    </svg>
  );
}

// 4. Доходы: круг + плюс
export function IconIncome({ size = 24, className, color = '#60a5fa', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

// 5. Расходы: круг + минус
export function IconExpense({ size = 24, className, color = '#f87171', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

// 6. Продукты: коробка
export function IconProducts({ size = 24, className, color = '#94a3b8', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// 7. Персонал: ромб-голова + тело (2 фигуры)
export function IconTeam({ size = 24, className, color = '#22d3ee', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,2 16,6 12,10 8,6" />
      <path d="M6 21v-4a6 6 0 0112 0v4" />
      <polygon points="20,5 22,7 20,9 18,7" opacity="0.5" />
      <path d="M16 21v-3a4 4 0 018 0v3" opacity="0.5" />
    </svg>
  );
}

// 8. Налоги: цель (3 круга)
export function IconTax({ size = 24, className, color = '#4ade80', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// 9. Риски: молния
export function IconRisk({ size = 24, className, color = '#f87171', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

// 10. Финансы: ромб + ₽
export function IconFinance({ size = 24, className, color = '#fbbf24', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
      <text x="12" y="16" textAnchor="middle" fill={color} stroke="none" fontSize="12" fontWeight="bold">₽</text>
    </svg>
  );
}

// 11. Интеграции: мост
export function IconIntegrations({ size = 24, className, color = '#22c55e', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="3" />
      <polyline points="16,8 20,12 16,16" />
      <polyline points="8,8 4,12 8,16" />
    </svg>
  );
}

// 12. Стартап: росток
export function IconStartup({ size = 24, className, color = '#fbbf24', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 22V8" />
      <path d="M12 8c-2-2-6-2-8-2v4c2 0 6 0 8 2" />
      <path d="M12 8c2-2 6-2 8-2v4c-2 0-6 0-8 2" />
    </svg>
  );
}

// 13. Шестерёнка (для настроек)
export function IconSettings({ size = 24, className, color = '#64748b', style }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style as React.CSSProperties}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// Map для удобного импорта по имени
export const ICONS = {
  dashboard: IconDashboard,
  business: IconBusiness,
  idea: IconIdea,
  income: IconIncome,
  expense: IconExpense,
  products: IconProducts,
  team: IconTeam,
  tax: IconTax,
  risk: IconRisk,
  finance: IconFinance,
  integrations: IconIntegrations,
  startup: IconStartup,
  settings: IconSettings,
} as const;

export type IconName = keyof typeof ICONS;
