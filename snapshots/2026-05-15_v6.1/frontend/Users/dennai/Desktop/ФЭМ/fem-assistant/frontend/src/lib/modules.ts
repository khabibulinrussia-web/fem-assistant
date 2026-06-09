'use client';

/**
 * Конфигурация модулей и блоков для трёхпанельного интерфейса
 */
export type ModuleId = 'fem' | 'accounting' | 'tax' | 'logistics' | 'smm' | 'crm' | 'ai';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: string; // имя иконки из ICONS
  desc: string;
  blocks: BlockDef[];
}

export interface BlockDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'fem',
    label: 'ФЭМ',
    icon: 'dashboard',
    desc: 'Финансово-экономическая модель',
    blocks: [
      { id: 'income', label: 'Доходы', icon: 'income', desc: 'Продукты и цены' },
      { id: 'expenses', label: 'Расходы', icon: 'expense', desc: 'Операционные расходы' },
      { id: 'staff', label: 'Персонал', icon: 'team', desc: 'ФОТ и штатка' },
      { id: 'tax', label: 'Налоги', icon: 'tax', desc: 'Система и ставка' },
      { id: 'investments', label: 'Инвестиции', icon: 'finance', desc: 'CAPEX и запуск' },
      { id: 'seasonality', label: 'Сезонность', icon: 'risk', desc: 'Падение по месяцам' },
      { id: 'params', label: 'Параметры', icon: 'settings', desc: 'Горизонт, ramp-up' },
      { id: 'turnover', label: 'Оборачиваемость', icon: 'business', desc: 'ДЗ, КЗ, запасы' },
    ],
  },
  {
    id: 'accounting',
    label: 'Бухгалтерия',
    icon: 'business',
    desc: 'Учёт и КУДиР',
    blocks: [
      { id: 'transactions', label: 'Проводки', icon: 'income', desc: 'Журнал операций' },
      { id: 'kudir', label: 'КУДиР', icon: 'tax', desc: 'Книга доходов и расходов' },
    ],
  },
  {
    id: 'tax',
    label: 'Налоги',
    icon: 'tax',
    desc: 'УСН и взносы',
    blocks: [
      { id: 'taxSystem', label: 'Режим', icon: 'tax', desc: 'УСН, ОСНО, патент' },
      { id: 'contributions', label: 'Взносы', icon: 'expense', desc: 'Фикс. + 1% с превыш' },
    ],
  },
  {
    id: 'logistics',
    label: 'Логистика',
    icon: 'integr',
    desc: 'Поставки и склад',
    blocks: [
      { id: 'suppliers', label: 'Поставщики', icon: 'business', desc: 'Контрагенты' },
      { id: 'stock', label: 'Запасы', icon: 'products', desc: 'Остатки на складе' },
      { id: 'delivery', label: 'Доставка', icon: 'expense', desc: 'Транспорт и сроки' },
    ],
  },
  {
    id: 'smm',
    label: 'SMM',
    icon: 'idea',
    desc: 'Маркетинг и реклама',
    blocks: [
      { id: 'ads', label: 'Реклама', icon: 'expense', desc: 'Бюджеты и каналы' },
      { id: 'content', label: 'Контент', icon: 'idea', desc: 'Публикации' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'team',
    desc: 'Клиенты и сделки',
    blocks: [
      { id: 'clients', label: 'Клиенты', icon: 'team', desc: 'База клиентов' },
      { id: 'deals', label: 'Сделки', icon: 'income', desc: 'Воронка продаж' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'idea',
    desc: 'Аналитика и прогнозы',
    blocks: [
      { id: 'forecast', label: 'Прогноз', icon: 'dashboard', desc: 'AI-предсказания' },
      { id: 'analysis', label: 'Анализ', icon: 'risk', desc: 'Отклонения и аномалии' },
    ],
  },
];
