/** Определения всех типов блоков для конструктора */

export type BlockCategory = 'income' | 'expenses' | 'finance' | 'operations' | 'settings';
export type BlockType =
  // Категории
  | 'income_cat'
  | 'expenses_cat'
  | 'finance_cat'
  | 'operations_cat'
  | 'settings_cat'
  // Конкретные блоки (только внутри категорий)
  | 'product'
  | 'discount'
  | 'rampup'
  | 'staff'
  | 'expense_fixed'
  | 'expense_var'
  | 'investment'
  | 'seasonality'
  | 'tax'
  | 'credit'
  | 'ar_ap'
  | 'global_settings';

export interface BlockDef {
  id: string;
  type: BlockType;
  label: string;
  icon: string;
  props: Record<string, any>;
  children: string[]; // id дочерних блоков
  parent: string | null;
}

export interface BlockSpec {
  label: string;
  icon: string;
  color: string;
  category?: BlockCategory; // для категорийных блоков
  childTypes?: BlockType[]; // какие блоки можно добавить внутрь
  canHaveChildren: boolean;
  props: PropSpec[];
  defaultProps: Record<string, any>;
}

export interface PropSpec {
  key: string;
  label: string;
  type: 'string' | 'number' | 'select' | 'boolean';
  options?: { label: string; value: string }[];
  min?: number;
  step?: number;
}

export const BLOCK_CATEGORIES: { type: BlockType; label: string; icon: string; color: string; childTypes: BlockType[] }[] = [
  { type: 'income_cat', label: 'Доходы', icon: '💰', color: '#22c55e', childTypes: ['product'] },
  { type: 'expenses_cat', label: 'Расходы', icon: '📉', color: '#ef4444', childTypes: ['staff', 'expense_fixed', 'expense_var'] },
  { type: 'finance_cat', label: 'Финансы', icon: '🏦', color: '#a855f7', childTypes: ['tax', 'credit', 'investment', 'ar_ap'] },
  { type: 'operations_cat', label: 'Операции', icon: '🔄', color: '#06b6d4', childTypes: ['seasonality'] },
  { type: 'settings_cat', label: 'Настройки', icon: '⚙️', color: '#6b7280', childTypes: ['global_settings'] },
];

export function getChildTypes(catType: BlockType): BlockType[] {
  const cat = BLOCK_CATEGORIES.find(c => c.type === catType);
  return cat?.childTypes || [];
}

export function isCategory(type: BlockType): boolean {
  return type.endsWith('_cat');
}

export const BLOCK_SPECS: Record<BlockType, BlockSpec> = {
  // Категории
  income_cat: {
    label: 'Доходы', icon: '💰', color: '#22c55e', canHaveChildren: true,
    props: [], defaultProps: {},
  },
  expenses_cat: {
    label: 'Расходы', icon: '📉', color: '#ef4444', canHaveChildren: true,
    props: [], defaultProps: {},
  },
  finance_cat: {
    label: 'Финансы', icon: '🏦', color: '#a855f7', canHaveChildren: true,
    props: [], defaultProps: {},
  },
  operations_cat: {
    label: 'Операции', icon: '🔄', color: '#06b6d4', canHaveChildren: true,
    props: [], defaultProps: {},
  },
  settings_cat: {
    label: 'Настройки', icon: '⚙️', color: '#6b7280', canHaveChildren: true,
    props: [], defaultProps: {},
  },
  // Конкретные блоки
  product: {
    label: 'Продукт', icon: '📦', color: '#3b82f6', canHaveChildren: true,
    childTypes: ['discount', 'rampup'],
    props: [
      { key: 'name', label: 'Название', type: 'string' },
      { key: 'retailPrice', label: 'РРЦ (₽)', type: 'number', min: 0, step: 10 },
      { key: 'salePrice', label: 'Цена продажи (₽)', type: 'number', min: 0, step: 10 },
      { key: 'quantity', label: 'Количество', type: 'number', min: 0 },
      { key: 'qtyUnit', label: 'Единица', type: 'select', options: [{ label: 'в день', value: 'day' }, { label: 'в мес', value: 'month' }] },
      { key: 'unitCost', label: 'Себестоимость (₽)', type: 'number', min: 0, step: 10 },
    ],
    defaultProps: { name: '', retailPrice: 0, salePrice: 0, quantity: 0, qtyUnit: 'day', unitCost: 0 },
  },
  discount: {
    label: 'Скидка', icon: '🏷️', color: '#ef4444', canHaveChildren: false,
    props: [
      { key: 'discountType', label: 'Тип', type: 'select', options: [{ label: '%', value: 'pct' }, { label: '₽', value: 'rub' }] },
      { key: 'discountValue', label: 'Значение', type: 'number', min: 0 },
      { key: 'discountScope', label: 'Область', type: 'select', options: [{ label: 'На продукт', value: 'product' }, { label: 'Весь прайс', value: 'all' }] },
    ],
    defaultProps: { discountType: 'pct', discountValue: 0, discountScope: 'product' },
  },
  rampup: {
    label: 'Рампап', icon: '📈', color: '#8b5cf6', canHaveChildren: false,
    props: [
      { key: 'months', label: 'Месяцев до пика', type: 'number', min: 1 },
      { key: 'startMonth', label: 'Старт с месяца', type: 'number', min: 1 },
    ],
    defaultProps: { months: 3, startMonth: 1 },
  },
  staff: {
    label: 'Сотрудник', icon: '👤', color: '#f59e0b', canHaveChildren: false,
    props: [
      { key: 'name', label: 'Должность', type: 'string' },
      { key: 'salary', label: 'Зарплата (₽)', type: 'number', min: 0 },
      { key: 'count', label: 'Количество', type: 'number', min: 1 },
      { key: 'bonusType', label: 'Тип бонуса', type: 'select', options: [{ label: 'Нет', value: '' }, { label: '% от продаж', value: 'revenue_pct' }, { label: 'Фикс', value: 'fixed' }] },
      { key: 'bonusValue', label: 'Бонус', type: 'number', min: 0 },
    ],
    defaultProps: { name: '', salary: 0, count: 1, bonusType: '', bonusValue: 0 },
  },
  expense_fixed: {
    label: 'Постоянный расход', icon: '🏢', color: '#6366f1', canHaveChildren: false,
    props: [
      { key: 'name', label: 'Название', type: 'string' },
      { key: 'value', label: 'Сумма (₽/мес)', type: 'number', min: 0 },
    ],
    defaultProps: { name: '', value: 0 },
  },
  expense_var: {
    label: 'Переменный расход', icon: '📊', color: '#14b8a6', canHaveChildren: false,
    props: [
      { key: 'name', label: 'Название', type: 'string' },
      { key: 'type', label: 'Тип', type: 'select', options: [{ label: '% выручки', value: 'revenue_pct' }, { label: '% закупа', value: 'purchase_pct' }, { label: '₽/шт', value: 'per_unit' }] },
      { key: 'value', label: 'Значение', type: 'number', min: 0 },
    ],
    defaultProps: { name: '', type: 'revenue_pct', value: 0 },
  },
  investment: {
    label: 'Инвестиция', icon: '💼', color: '#22c55e', canHaveChildren: false,
    props: [
      { key: 'name', label: 'Название', type: 'string' },
      { key: 'amount', label: 'Сумма (₽)', type: 'number', min: 0 },
      { key: 'month', label: 'Месяц', type: 'number', min: 1 },
      { key: 'depreciation', label: 'Амортизация (мес)', type: 'number', min: 0 },
    ],
    defaultProps: { name: '', amount: 0, month: 1, depreciation: 0 },
  },
  seasonality: {
    label: 'Сезонность', icon: '🌊', color: '#06b6d4', canHaveChildren: false,
    props: [
      { key: 'monthPcts', label: 'Пары месяц-спад (JSON)', type: 'string' },
    ],
    defaultProps: { monthPcts: [] },
  },
  tax: {
    label: 'Налоги', icon: '🏛️', color: '#dc2626', canHaveChildren: false,
    props: [
      { key: 'taxSystem', label: 'Система', type: 'select', options: [{ label: 'УСН', value: 'usn' }, { label: 'ОСНО', value: 'osno' }] },
      { key: 'usnType', label: 'Тип УСН', type: 'select', options: [{ label: 'Доходы 6%', value: 'income' }, { label: 'Доходы−Расходы 15%', value: 'income_minus_expenses' }] },
    ],
    defaultProps: { taxSystem: 'usn', usnType: 'income_minus_expenses' },
  },
  credit: {
    label: 'Кредит', icon: '🏦', color: '#a855f7', canHaveChildren: false,
    props: [
      { key: 'amount', label: 'Сумма (₽)', type: 'number', min: 0 },
      { key: 'rate', label: 'Ставка (% годовых)', type: 'number', min: 0 },
      { key: 'term', label: 'Срок (мес)', type: 'number', min: 1 },
      { key: 'month', label: 'Месяц получения', type: 'number', min: 1 },
    ],
    defaultProps: { amount: 0, rate: 0, term: 12, month: 1 },
  },
  ar_ap: {
    label: 'КЗ / ДЗ', icon: '🔄', color: '#f97316', canHaveChildren: false,
    props: [
      { key: 'arDays', label: 'ДЗ (дней)', type: 'number', min: 0 },
      { key: 'apDays', label: 'КЗ (дней)', type: 'number', min: 0 },
      { key: 'invDays', label: 'Запасы (дней)', type: 'number', min: 0 },
    ],
    defaultProps: { arDays: 0, apDays: 0, invDays: 0 },
  },
  global_settings: {
    label: 'Параметры расчёта', icon: '⚙️', color: '#6b7280', canHaveChildren: false,
    props: [
      { key: 'months', label: 'Месяцев расчёта', type: 'number', min: 1 },
      { key: 'inflation', label: 'Инфляция (% мес)', type: 'number', min: 0, step: 0.1 },
    ],
    defaultProps: { months: 12, inflation: 0 },
  },
};
