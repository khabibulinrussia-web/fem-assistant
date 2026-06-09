'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import BlockPanel from '@/components/BlockPanel';
import { BlockDef, BlockType, BLOCK_SPECS } from '@/lib/blockTypes';
import { useRouter } from 'next/navigation';
import { supabase, getProjects, createProject, deleteProject, updateProjectAssumptions, type Project } from '@/lib/supabase-client';
import { IconSettings, IconDashboard, IconBusiness, IconIdea, IconIncome, IconExpense, IconProducts, IconTeam, IconTax, IconRisk, IconFinance, IconIntegrations, IconStartup } from '@/components/icons';

type Theme = 'dark' | 'light';
type ModuleId = 'fem' | 'accounting' | 'tax' | 'logistics' | 'smm' | 'crm' | 'ai';

const M_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  dashboard: IconDashboard, business: IconBusiness, idea: IconIdea,
  income: IconIncome, expense: IconExpense, products: IconProducts,
  team: IconTeam, tax: IconTax, risk: IconRisk, finance: IconFinance,
  integr: IconIntegrations, startup: IconStartup,
};

interface BlockNode {
  id: string; label: string; iconName: string; color: string;
  x: number; y: number; desc: string; connections: string[];
}
interface ModuleDef {
  id: ModuleId; label: string; iconName: string; color: string;
  blocks: BlockNode[];
}

const MODULES: ModuleDef[] = [
  {
    id: 'fem', label: 'ФЭМ', iconName: 'dashboard', color: '#60a5fa',
    blocks: [
      { id: 'income', label: 'Доходы', iconName: 'income', color: '#60a5fa', x: 40, y: 30, desc: 'Продукты, цены', connections: ['expenses','staff','tax'] },
      { id: 'expenses', label: 'Расходы', iconName: 'expense', color: '#ef4444', x: 40, y: 130, desc: 'Операционные', connections: ['staff','tax'] },
      { id: 'staff', label: 'Персонал', iconName: 'team', color: '#2dd4bf', x: 220, y: 80, desc: 'ФОТ', connections: ['tax','investments'] },
      { id: 'tax', label: 'Налоги', iconName: 'tax', color: '#34d399', x: 220, y: 210, desc: 'Ставка, режим', connections: ['params'] },
      { id: 'investments', label: 'Инвестиции', iconName: 'finance', color: '#fbbf24', x: 400, y: 50, desc: 'CAPEX', connections: ['params'] },
      { id: 'seasonality', label: 'Сезонность', iconName: 'risk', color: '#f97316', x: 400, y: 150, desc: 'Корректировка', connections: ['params'] },
      { id: 'turnover', label: 'Оборачиваемость', iconName: 'business', color: '#a78bfa', x: 400, y: 250, desc: 'ДЗ, КЗ, запасы', connections: [] },
      { id: 'params', label: 'Параметры', iconName: 'settings', color: '#94a3b8', x: 580, y: 130, desc: 'Ramp-up, горизонт', connections: [] },
    ],
  },
  {
    id: 'accounting', label: 'Бухгалтерия', iconName: 'business', color: '#a78bfa',
    blocks: [
      { id: 'transactions', label: 'Проводки', iconName: 'income', color: '#a78bfa', x: 40, y: 50, desc: 'Журнал', connections: ['kudir'] },
      { id: 'kudir', label: 'КУДиР', iconName: 'tax', color: '#34d399', x: 240, y: 50, desc: 'Книга', connections: [] },
    ],
  },
  {
    id: 'tax', label: 'Налоги', iconName: 'tax', color: '#34d399',
    blocks: [
      { id: 'taxSystem', label: 'Режим', iconName: 'tax', color: '#34d399', x: 40, y: 50, desc: 'УСН/ОСНО', connections: ['contributions'] },
      { id: 'contributions', label: 'Взносы', iconName: 'expense', color: '#f97316', x: 240, y: 50, desc: 'Фикс. + 1%', connections: [] },
    ],
  },
  {
    id: 'logistics', label: 'Логистика', iconName: 'integr', color: '#fbbf24',
    blocks: [
      { id: 'suppliers', label: 'Поставщики', iconName: 'business', color: '#fbbf24', x: 40, y: 30, desc: 'Контрагенты', connections: ['stock'] },
      { id: 'stock', label: 'Запасы', iconName: 'products', color: '#fbbf24', x: 240, y: 30, desc: 'Остатки', connections: ['delivery'] },
      { id: 'delivery', label: 'Доставка', iconName: 'expense', color: '#ef4444', x: 440, y: 30, desc: 'Транспорт', connections: [] },
    ],
  },
  {
    id: 'smm', label: 'SMM', iconName: 'idea', color: '#f472b6',
    blocks: [
      { id: 'ads', label: 'Реклама', iconName: 'expense', color: '#f472b6', x: 40, y: 50, desc: 'Бюджеты', connections: ['content'] },
      { id: 'content', label: 'Контент', iconName: 'idea', color: '#f472b6', x: 260, y: 50, desc: 'Публикации', connections: [] },
    ],
  },
  {
    id: 'crm', label: 'CRM', iconName: 'team', color: '#2dd4bf',
    blocks: [
      { id: 'clients', label: 'Клиенты', iconName: 'team', color: '#2dd4bf', x: 40, y: 50, desc: 'База', connections: ['deals'] },
      { id: 'deals', label: 'Сделки', iconName: 'income', color: '#2dd4bf', x: 260, y: 50, desc: 'Воронка', connections: [] },
    ],
  },
  {
    id: 'ai', label: 'AI', iconName: 'idea', color: '#f97316',
    blocks: [
      { id: 'forecast', label: 'Прогноз', iconName: 'dashboard', color: '#f97316', x: 40, y: 50, desc: 'AI-предск.', connections: ['analysis'] },
      { id: 'analysis', label: 'Анализ', iconName: 'risk', color: '#f97316', x: 260, y: 50, desc: 'Отклонения', connections: [] },
    ],
  },
];

type FieldDef = { key: string; label: string; type: 'number' | 'percent' | 'text' | 'select'; placeholder?: string; options?: { value: string; label: string }[]; hint?: string };

interface AssumptionGroup {
  blockId: string;
  title: string;
  fields: FieldDef[];
  aiTip?: string;
  dynamic?: 'expense' | 'investment' | 'product' | 'staff'; // blocks that support adding custom rows
}

const GROUPS: AssumptionGroup[] = [
  {
    blockId: 'income', title: 'Продукты',
    fields: [],
    dynamic: 'product',
    aiTip: 'Добавьте все продукты/услуги. Маржинальность считается автоматически: (цена реализации − себестоимость) × количество',
  },
  {
    blockId: 'expenses', title: 'Расходы',
    fields: [],
    aiTip: 'Переменные — % от выручки или закупа. Постоянные — фикс. суммы в месяц',
    dynamic: 'expense',
  },
  {
    blockId: 'staff', title: 'Персонал',
    fields: [],
    dynamic: 'staff',
    aiTip: 'Премия от выручки считается автоматически. Учитывайте НДФЛ и страховые (≈43% сверх оклада)',
  },
  {
    blockId: 'tax', title: 'Налоги',
    fields: [
      { key: 'taxSystem', label: 'Система', type: 'select', options: [
        { value: 'usn_6', label: 'УСН Доходы 6%' },
        { value: 'usn_15', label: 'УСН Доходы-Расходы 15%' },
        { value: 'osno', label: 'ОСНО' },
        { value: 'patent', label: 'Патент' },
      ] },
      { key: 'insuranceFixed', label: 'Фикс. взносы ИП (в год)', type: 'number', placeholder: '57 000' },
      { key: 'insuranceAdditional', label: 'Доп. взнос 1% с дохода >300к', type: 'percent', placeholder: '1' },
    ],
    aiTip: 'УСН 6%: налог 6% от выручки. УСН 15%: налог 15% от EBITDA, но не менее 1% от выручки',
  },
  {
    blockId: 'investments', title: 'Инвестиции',
    fields: [
      { key: 'investmentReg', label: 'Регистрация ИП', type: 'number', placeholder: '5 000' },
      { key: 'investmentReserve', label: 'Резервный фонд', type: 'number', placeholder: '50 000' },
    ],
    dynamic: 'investment',
  },
  {
    blockId: 'params', title: 'Параметры модели',
    fields: [
      { key: 'forecastMonths', label: 'Горизонт (мес)', type: 'number', placeholder: '36' },
      { key: 'rampUp1', label: 'Ramp-up месяц 1 (%)', type: 'percent', placeholder: '85' },
      { key: 'rampUp2', label: 'Ramp-up месяц 2 (%)', type: 'percent', placeholder: '90' },
      { key: 'rampUp3', label: 'Ramp-up месяц 3 (%)', type: 'percent', placeholder: '100' },
    ],
  },
  {
    blockId: 'seasonality', title: 'Сезонность',
    fields: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((m, i) => ({
      key: `seasonality${i + 1}`, label: `${m} (%)`, type: 'percent' as const, placeholder: '100',
    })),
  },
  {
    blockId: 'turnover', title: 'Оборачиваемость',
    fields: [
      { key: 'receivablesTurnover', label: 'ДЗ (дни)', type: 'number', placeholder: '0', hint: '0 = предоплата' },
      { key: 'payablesTurnover', label: 'КЗ (дни)', type: 'number', placeholder: '0' },
      { key: 'inventoryTurnover', label: 'Запасы (дни)', type: 'number', placeholder: '0' },
    ],
  },
];

// Build a quick lookup: blockId -> Group
const GROUP_BY_BLOCK: Record<string, AssumptionGroup> = {};
for (const g of GROUPS) GROUP_BY_BLOCK[g.blockId] = g;

// Also ensure all MODULE blocks have a group (fallback for non-FЭМ modules)
for (const mod of MODULES) {
  for (const b of mod.blocks) {
    if (!GROUP_BY_BLOCK[b.id]) {
      const fallback: AssumptionGroup = { blockId: b.id, title: b.label, fields: [{ key: '_', label: 'В разработке', type: 'text', placeholder: '—' }] };
      GROUP_BY_BLOCK[b.id] = fallback;
      GROUPS.push(fallback);
    }
  }
}

/* ===============================
   RESIZABLE PANEL COMPONENT
   =============================== */
function useResizable(defaultWidth: number, minW: number, maxW: number) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.max(minW, Math.min(maxW, startW.current + delta));
      if (next !== width) setWidth(next);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [minW, maxW, width]);

  return { width, setWidth, dragHandle: { onMouseDown } };
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown}
      style={{
        width: 4, cursor: 'col-resize', flexShrink: 0,
        background: 'transparent', position: 'relative', zIndex: 20,
      }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: -2, right: -2,
        opacity: 0,
      }} />
    </div>
  );
}

function DraggableConnLine({ x1, y1, x2, y2, c }: { x1: number; y1: number; x2: number; y2: number; c: string }) {
  const my = (y1 + y2) / 2;
  return <path d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`} fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="4,4" />;
}

export default function HomePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('dark');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selMod, setSelMod] = useState<ModuleId>('fem');
  const [selBlock, setSelBlock] = useState<string | null>(null);

  // Drag-block state
  const blockPositions = useRef<Record<string,{x:number;y:number}>>({});
  const blockDims = useRef<Record<string,{w:number;h:number}>>({});
  const dragState = useRef<{id:string;ox:number;oy:number;mx:number;my:number}|null>(null);
  const [blockPosVer, setBlockPosVer] = useState(0);

  // Init positions from MODULE defs + restore from localStorage
  useEffect(() => {
    const pos: Record<string,{x:number;y:number}> = {};
    for (const mod of MODULES) {
      for (const b of mod.blocks) {
        pos[`${mod.id}/${b.id}`] = { x: b.x, y: b.y };
      }
    }
    // Override with saved positions from localStorage
    try {
      const saved = localStorage.getItem('erp_block_positions');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string,{x:number;y:number}>;
        for (const key of Object.keys(parsed)) {
          if (pos[key]) {
            pos[key] = parsed[key];
          }
        }
      }
    } catch {}
    blockPositions.current = pos;
    setBlockPosVer(v => v+1);
  }, []);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (blockPosVer > 0) {
      try {
        localStorage.setItem('erp_block_positions', JSON.stringify(blockPositions.current));
      } catch {}
    }
  }, [blockPosVer]);

  function onBlockMouseDown(e: React.MouseEvent, modId: ModuleId, blockId: string) {
    e.preventDefault();
    const key = `${modId}/${blockId}`;
    const pos = blockPositions.current[key];
    if (!pos) return;
    dragState.current = { id: key, ox: pos.x, oy: pos.y, mx: e.clientX, my: e.clientY };
    const dim = blockDims.current[key];
    const origW = dim ? dim.w : 160;
    const origH = dim ? dim.h : 60;
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;opacity:0.8;width:${origW}px;height:${origH}px;background:transparent;border:2px solid #3b82f6;border-radius:8px;top:${e.clientY-20}px;left:${e.clientX - origW/2}px;`;
    document.body.appendChild(ghost);
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      ghost.style.top = `${ev.clientY - 20}px`;
      ghost.style.left = `${ev.clientX - origW/2}px`;
    };
    const onUp = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const { id, ox, oy, mx, my } = dragState.current;
      const dx = ev.clientX - mx;
      const dy = ev.clientY - my;
      blockPositions.current[id] = { x: Math.max(0, ox + dx), y: Math.max(0, oy + dy) };
      dragState.current = null;
      ghost.remove();
      setBlockPosVer(v => v+1);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  const [fd, setFd] = useState<Record<string,any>>({});
  const [showNew, setShowNew] = useState(false);
  const [showSt, setShowSt] = useState(false);
  const [nn, setNn] = useState('');
  const [nc, setNc] = useState('₽');

  // Dynamic items state: varExpenses, fixedExpenses, customInvestments
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blocks, setBlocks] = useState<BlockDef[]>([]);
  // Функция соединения блоков
  const connectBlocks = useCallback((parentId: string, childId: string) => {
    setBlocks(prev => prev.map(b => b.id === parentId ? {...b, children: [...b.children.filter(c => c !== childId), childId]} : b).map(b => b.id === childId ? {...b, parent: b.parent || parentId} : b));
  }, []);
  const [customInvestments, setCustomInvestments] = useState<{ id: string; name: string; value: number; month: number }[]>([]);

  // Variable expenses (linked to revenue or purchase)
  interface VarExpense {
    id: string;
    name: string;
    type: 'revenue_pct' | 'cogs_pct';
    value: number;
  }
  const [varExpenses, setVarExpenses] = useState<VarExpense[]>([]);

  // Fixed expenses (flat monthly amounts)
  interface FixedExpense {
    id: string;
    name: string;
    value: number;
  }
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

  // Products state — dynamic product cards
  interface ProductItem {
    id: string;
    productName: string;
    retailPrice: number;
    salePrice: number;
    quantity: number;
    qtyUnit: 'day' | 'month';
    unitCost: number;
    discountType: 'pct' | 'rub';
    discountValue: number;
    discountScope: 'product' | 'all';
  }
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Staff state — dynamic employee cards
  interface StaffItem {
    id: string;
    staffName: string;
    salary: number;
    bonusType: 'none' | 'pct_of_salary' | 'pct_of_revenue';
    bonusValue: number;
    staffCount: number;
  }
  const [staffList, setStaffList] = useState<StaffItem[]>([]);

  // NEW STATE: selected project, months dropdown, calculating
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [months, setMonths] = useState<number>(36);
  const [calculating, setCalculating] = useState(false);

  // Auto-save refs
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fdRef = useRef<Record<string,any>>({});
  const selProjectRef = useRef<Project | null>(null);

  // Keep refs in sync for auto-save closure
  fdRef.current = fd;
  selProjectRef.current = selProject;

  const leftR = useResizable(160, 48, 300);
  const rightR = useResizable(320, 40, 600);

  const th = theme === 'dark'
    ? { bg:'#0b1120',card:'#111827',cb:'#1e293b',tx:'#f1f5f9',tm:'#64748b',td:'#475569',hb:'#0a0f1d',ibg:'#0f172a',ib:'#334155',ac:'#2563eb',sec:'#0a0f1d',can:'#070d19' }
    : { bg:'#f8fafc',card:'#ffffff',cb:'#e2e8f0',tx:'#0f172a',tm:'#475569',td:'#94a3b8',hb:'#ffffff',ibg:'#f1f5f9',ib:'#cbd5e1',ac:'#2563eb',sec:'#f1f5f9',can:'#f1f5f9' };

  useEffect(() => {
    const s = localStorage.getItem('erp_theme') as Theme | null;
    if (s) setTheme(s);
    (async () => {
      const d = await getProjects();
      if (d) {
        setProjects(d);
        // Auto-select project from URL query param
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('projectId');
        if (pid) {
          const found = d.find(p => p.id === pid);
          if (found) selectProject(found);
        }
      }
    })();
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      const p = selProjectRef.current;
      const data = fdRef.current;
      if (p && Object.keys(data).length > 0) {
        updateProjectAssumptions(p.id, { ...data })
          .catch(() => {}); // silent fail
      }
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, []);

  // Save on blur — debounced via onBlur on inputs
  const saveData = useCallback(async (data: Record<string,any>) => {
    if (!selProjectRef.current) return;
    try {
      await updateProjectAssumptions(selProjectRef.current.id, { ...data });
    } catch {}
  }, []);

  const leftNarrow = leftR.width < 100;
  const rightNarrow = rightR.width < 80;

  /** Determine project_type heuristic for legacy projects */
  function detectProjectType(assumptions: Record<string, unknown>): 'new' | 'existing' {
    if (assumptions._projectType) return assumptions._projectType as 'new' | 'existing';
    if (assumptions.targetRevenue) return 'existing';
    return 'new';
  }

  async function createP() {
    if (!nn.trim()) return;
    const p = await createProject(nn, nc, months);
    if (p) {
      await supabase.from('projects').update({ assumptions: { _projectType: 'new', currency: nc } }).eq('id', p.id);
      // Select the new project
      setSelProject(p);
      setFd({});
      setShowNew(false);
      setNn('');
      setSelBlock(null);
      const d = await getProjects();
      if (d) setProjects(d);
    }
  }

  async function delP(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Удалить проект?')) return;
    if (selProject?.id === id) {
      setSelProject(null);
      setFd({});
    }
    await deleteProject(id);
    const d = await getProjects();
    if (d) setProjects(d);
  }

  /** Select a project: load its assumptions into the form fields */
  function selectProject(p: Project) {
    setSelProject(p);
    setSelBlock(null);
    setMonths(p.months || 36);

    const ass = (p.assumptions || {}) as Record<string, any>;

    // Heuristic for legacy projects
    if (!ass._projectType) {
      ass._projectType = detectProjectType(ass);
      // Silently update the project type in background
      updateProjectAssumptions(p.id, ass).catch(() => {});
    }

    // Set form data from assumptions
    const formData: Record<string,any> = {};
    const restoredVarExpenses: VarExpense[] = [];
    const restoredFixedExpenses: FixedExpense[] = [];
    const restoredInvestments: { id: string; name: string; value: number; month: number }[] = [];
    const restoredProducts: ProductItem[] = [];
    const restoredStaff: StaffItem[] = [];

    for (const [key, value] of Object.entries(ass)) {
      if (key === '_projectType' || key === 'currency') continue;

      // Detect product fields: product_0_name, product_0_retailPrice, etc.
      const productMatch = key.match(/^product_(\d+)_(\w+)$/);
      if (productMatch) {
        const idx = parseInt(productMatch[1]);
        const subKey = productMatch[2];
        if (!restoredProducts[idx]) restoredProducts[idx] = { id: `prod_${idx}`, productName: '', retailPrice: 0, salePrice: 0, quantity: 0, qtyUnit: 'day', unitCost: 0, discountType: 'pct', discountValue: 0, discountScope: 'product' };
        if (subKey === 'name') restoredProducts[idx].productName = String(value ?? '');
        else if (subKey === 'retailPrice') restoredProducts[idx].retailPrice = Number(value) || 0;
        else if (subKey === 'salePrice') restoredProducts[idx].salePrice = Number(value) || 0;
        else if (subKey === 'quantity') restoredProducts[idx].quantity = Number(value) || 0;
        else if (subKey === 'qtyUnit') restoredProducts[idx].qtyUnit = (value === 'month' ? 'month' : 'day');
        else if (subKey === 'unitCost') restoredProducts[idx].unitCost = Number(value) || 0;
        else if (subKey === 'discountType') restoredProducts[idx].discountType = (value === 'rub' ? 'rub' : 'pct');
        else if (subKey === 'discountValue') restoredProducts[idx].discountValue = Number(value) || 0;
        else if (subKey === 'discountScope') restoredProducts[idx].discountScope = (value === 'all' ? 'all' : 'product');
        formData[key] = value;
        continue;
      }

      // Detect staff fields: staff_0_name, staff_0_salary, etc.
      const staffMatch = key.match(/^staff_(\d+)_(\w+)$/);
      if (staffMatch) {
        const idx = parseInt(staffMatch[1]);
        const subKey = staffMatch[2];
        if (!restoredStaff[idx]) restoredStaff[idx] = { id: `staff_${idx}`, staffName: '', salary: 0, bonusType: 'none', bonusValue: 0, staffCount: 1 };
        if (subKey === 'name') restoredStaff[idx].staffName = String(value ?? '');
        else if (subKey === 'salary') restoredStaff[idx].salary = Number(value) || 0;
        else if (subKey === 'bonusType') restoredStaff[idx].bonusType = (value as 'none' | 'pct_of_salary' | 'pct_of_revenue') || 'none';
        else if (subKey === 'bonusValue') restoredStaff[idx].bonusValue = Number(value) || 0;
        else if (subKey === 'count') restoredStaff[idx].staffCount = Number(value) || 1;
        formData[key] = value;
        continue;
      }

      // Detect variable expense fields: varExpense_0_name, varExpense_0_type, varExpense_0_value
      const veMatch = key.match(/^varExpense_(\d+)_(name|type|value)$/);
      if (veMatch) {
        const idx = parseInt(veMatch[1]);
        const subKey = veMatch[2] as 'name' | 'type' | 'value';
        if (!restoredVarExpenses[idx]) restoredVarExpenses[idx] = { id: `var_${idx}`, name: '', type: 'revenue_pct', value: 0 };
        if (subKey === 'name') restoredVarExpenses[idx].name = String(value ?? '');
        else if (subKey === 'type') restoredVarExpenses[idx].type = (value as 'revenue_pct' | 'cogs_pct') || 'revenue_pct';
        else restoredVarExpenses[idx].value = Number(value) || 0;
        formData[key] = value;
        continue;
      }

      // Detect fixed expense fields: fixedExpense_0_name, fixedExpense_0_value
      const feMatch = key.match(/^fixedExpense_(\d+)_(name|value)$/);
      if (feMatch) {
        const idx = parseInt(feMatch[1]);
        const subKey = feMatch[2] as 'name' | 'value';
        if (!restoredFixedExpenses[idx]) restoredFixedExpenses[idx] = { id: `fix_${idx}`, name: '', value: 0 };
        if (subKey === 'name') restoredFixedExpenses[idx].name = String(value ?? '');
        else restoredFixedExpenses[idx].value = Number(value) || 0;
        formData[key] = value;
        continue;
      }

      // Detect dynamic investment fields: investment_0_name, investment_0_value, investment_0_month
      const invMatch = key.match(/^investment_(\d+)_(name|value|month)$/);
      if (invMatch) {
        const idx = parseInt(invMatch[1]);
        const subKey = invMatch[2] as 'name' | 'value' | 'month';
        if (!restoredInvestments[idx]) restoredInvestments[idx] = { id: `inv_${idx}`, name: '', value: 0, month: 1 };
        if (subKey === 'name') restoredInvestments[idx].name = String(value ?? '');
        else if (subKey === 'value') restoredInvestments[idx].value = Number(value) || 0;
        else restoredInvestments[idx].month = Number(value) || 1;
        formData[key] = value;
        continue;
      }

      formData[key] = value;
    }

    setFd(formData);
    setVarExpenses(restoredVarExpenses.filter(e => e != null));
    setFixedExpenses(restoredFixedExpenses.filter(e => e != null));
    setCustomInvestments(restoredInvestments.filter(e => e != null));
    setProducts(restoredProducts.filter(p => p != null));
    setStaffList(restoredStaff.filter(s => s != null));
  }

  function refreshProjects() {
    getProjects().then(d => { if (d) setProjects(d); }).catch(() => {});
  }

  /** Calculate: POST to /api/calculate then redirect to results */
  async function handleCalculate() {
    if (!selProject) return;
    setCalculating(true);
    try {
      // Сохраняем текущий стейт
      await saveData(fd);

      // 🔥 Собираем assumptions ТОЛЬКО из живых стейтов — ничего из fd/Supabase
      const assumptions: Record<string, any> = {};
      
      // Базовые поля: название, налоги, и т.д.
      assumptions.name = selProject.name;
      
      // Налоги — из правой панели (живые стейты)
      // taxSystem уже пришёл с fd, но нормализуем
      const tSys = String(fd.taxSystem || 'usn_6');
      assumptions.taxSystem = 'usn';
      if (tSys === 'usn_15' || fd.usnType === 'income_minus_expenses') {
        assumptions.usnType = 'income_minus_expenses';
      } else {
        assumptions.usnType = 'income';
      }
      // Фикс. взносы ИП
      const ipFixed = Number(fd.ipFixedContrib) || 0;
      const ipExtra = Number(fd.ipExtraContrib) || 0;
      if (ipFixed > 0) assumptions.ipFixedContrib = ipFixed;
      if (ipExtra > 0) assumptions.ipExtraContrib = ipExtra;
      
      // VarExpenses — конвертируем type → unit/applyTo для engine
      const varExpArr = varExpenses.map(e => {
        if (e.type === 'revenue_pct') {
          return { name: e.name, unit: 'pct', applyTo: 'all_revenue', value: e.value };
        } else if (e.type === 'cogs_pct') {
          return { name: e.name, unit: 'pct', applyTo: 'all_purchase', value: e.value };
        } else {
          return { name: e.name, unit: 'rub', value: e.value };
        }
      }).filter(e => e.value > 0 || e.name);
      assumptions.varExpenses = varExpArr;
      
      // FixedExpenses — уже рубли
      const fixedExpArr = fixedExpenses.filter(e => e.value > 0 || e.name).map(e => ({
        name: e.name,
        unit: 'rub',
        value: e.value,
      }));
      if (fixedExpArr.length > 0) {
        assumptions.fixedExpenses = fixedExpArr;
      }
      
      // Products из живого стейта (quantity-driven, без orders)
      const prodArr = products.map(p => {
        // Если в день — умножаем на 30 для engine
        const qty = (p.qtyUnit || 'day') === 'month' ? p.quantity : p.quantity * 30;
        return {
          name: p.productName,
          retailPrice: p.retailPrice || p.salePrice || 0,
          quantity: qty,
          cogs: p.unitCost,
          discountType: p.discountType || 'pct',
          discountValue: p.discountValue || 0,
          discountScope: p.discountScope || 'product',
          qtyUnit: p.qtyUnit || 'day',
        };
      }).filter(p => p.quantity > 0 || p.name);
      assumptions.products = prodArr;
      // Принудительно отключаем orders-engine
      assumptions.start_orders = 0;
      assumptions.startOrders = 0;
      assumptions.target_orders = 0;
      assumptions.targetOrders = 0;
      assumptions.months = months;
      
      // Staff из живого стейта
      const staffArr = staffList.map(s => ({
        name: s.staffName,
        salary: s.salary,
        bonusType: s.bonusType,
        bonusValue: s.bonusValue,
        headcount: s.staffCount,
      })).filter(s => s.name || s.salary > 0);
      assumptions.staff = staffArr;

      // Инвестиции — тоже из fd (если есть)
      const custInv = fd.customInvestments || fd.investments || [];
      if (Array.isArray(custInv) && custInv.length > 0) {
        assumptions.investments = custInv;
      }
      
      // Сезонность
      const seasRaw = fd.seasonality || fd.season || [];
      if (Array.isArray(seasRaw) && seasRaw.length > 0) {
        assumptions.seasonality = seasRaw;
      }

      const project_id = selProject.id;
      const calcMonths = months || 36;
      const body = JSON.stringify({ assumptions, project_id, months: calcMonths });
      
      console.log('🔥 ASSUMPTIONS:', JSON.stringify(assumptions).slice(0, 800));
      
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Calculate error:', errText);
        alert('Ошибка расчёта: ' + (errText.slice(0, 200)));
        setCalculating(false);
        return;
      }
      const result = await response.json();
      // Сохраняем результат в sessionStorage — страница результатов прочитает оттуда
      sessionStorage.setItem(`calc_result_${project_id}`, JSON.stringify(result));
      // И сохраняем что расчёт был сделан с этими assumptions
      sessionStorage.setItem(`calc_payload_${project_id}`, JSON.stringify({ assumptions, months: calcMonths }));
      router.push(`/project/${project_id}/results`);
    } catch (err: any) {
      alert('Ошибка при расчёте: ' + (err.message || 'Неизвестная ошибка'));
      setCalculating(false);
    }
  }

  /** Handle field change with auto-save debounce */
  function handleFieldChange(key: string, value: any) {
    setFd(prev => {
      const next = { ...prev, [key]: value };
      // Trigger save on change via ref
      if (selProjectRef.current) {
        // Debounce save with a small delay
        clearTimeout((window as any).__fieldSaveTimer);
        (window as any).__fieldSaveTimer = setTimeout(() => {
          updateProjectAssumptions(selProjectRef.current!.id, next).catch(() => {});
        }, 800);
      }
      return next;
    });
  }

  /** Field onBlur — immediate save */
  function handleFieldBlur() {
    if (selProjectRef.current && Object.keys(fdRef.current).length > 0) {
      updateProjectAssumptions(selProjectRef.current.id, { ...fdRef.current }).catch(() => {});
    }
  }

  /** Add a custom expense row */
  // ===== Variable expenses (linked to revenue or purchase) =====
  function addVarExpense() {
    const id = `var_${Date.now()}`;
    setVarExpenses(prev => [...prev, { id, name: '', type: 'revenue_pct', value: 0 }]);
    syncVarExpenses();
  }
  function removeVarExpense(id: string) {
    setVarExpenses(prev => { const next = prev.filter(e => e.id !== id); syncVarExpensesRef(next); return next; });
  }
  function updateVarExpense(id: string, field: 'name' | 'type' | 'value', val: any) {
    setVarExpenses(prev => { const next = prev.map(e => e.id === id ? { ...e, [field]: val } : e); syncVarExpensesRef(next); return next; });
  }
  function syncVarExpenses() {
    setVarExpenses(prev => { syncVarExpensesRef(prev); return prev; });
  }
  function syncVarExpensesRef(list: VarExpense[]) {
    const newFd = { ...fdRef.current };
    for (const key of Object.keys(newFd)) { if (key.startsWith('varExpense_')) delete newFd[key]; }
    list.forEach((e, i) => {
      newFd[`varExpense_${i}_name`] = e.name;
      newFd[`varExpense_${i}_type`] = e.type;
      newFd[`varExpense_${i}_value`] = e.value;
    });
    // Also store as array for engine
    newFd['varExpenses'] = list.map(e => ({ name: e.name, type: e.type, value: e.value }));
    setFd(newFd);
  }

  // ===== Fixed expenses (flat monthly amounts) =====
  function addFixedExpense() {
    const id = `fix_${Date.now()}`;
    setFixedExpenses(prev => [...prev, { id, name: '', value: 0 }]);
    syncFixedExpenses();
  }
  function removeFixedExpense(id: string) {
    setFixedExpenses(prev => { const next = prev.filter(e => e.id !== id); syncFixedExpensesRef(next); return next; });
  }
  function updateFixedExpense(id: string, field: 'name' | 'value', val: any) {
    setFixedExpenses(prev => { const next = prev.map(e => e.id === id ? { ...e, [field]: val } : e); syncFixedExpensesRef(next); return next; });
  }
  function syncFixedExpenses() {
    setFixedExpenses(prev => { syncFixedExpensesRef(prev); return prev; });
  }
  function syncFixedExpensesRef(list: FixedExpense[]) {
    const newFd = { ...fdRef.current };
    for (const key of Object.keys(newFd)) { if (key.startsWith('fixedExpense_')) delete newFd[key]; }
    list.forEach((e, i) => {
      newFd[`fixedExpense_${i}_name`] = e.name;
      newFd[`fixedExpense_${i}_value`] = e.value;
    });
    // Also store as array for engine
    newFd['expenses'] = list.map(e => ({ name: e.name, value: e.value }));
    setFd(newFd);
  }

  /** Add a custom investment row */
  function addCustomInvestment() {
    const id = `inv_${Date.now()}`;
    const idx = customInvestments.length;
    setCustomInvestments(prev => [...prev, { id, name: '', value: 0, month: 1 }]);
    setFd(prev => ({ ...prev, [`investment_${idx}_name`]: '', [`investment_${idx}_value`]: 0, [`investment_${idx}_month`]: 1 }));
  }

  /** Remove a custom investment row */
  function removeCustomInvestment(id: string) {
    setCustomInvestments(prev => {
      const filtered = prev.filter(e => e.id !== id);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('investment_')) delete newFd[key];
      }
      filtered.forEach((e, i) => {
        newFd[`investment_${i}_name`] = e.name;
        newFd[`investment_${i}_value`] = e.value;
        newFd[`investment_${i}_month`] = e.month;
      });
      setFd(newFd);
      return filtered;
    });
  }

  /** Update a custom investment field */
  function updateCustomInvestment(id: string, field: 'name' | 'value' | 'month', val: string | number) {
    setCustomInvestments(prev => {
      const next = prev.map(e => e.id === id ? { ...e, [field]: val } : e);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('investment_')) delete newFd[key];
      }
      next.forEach((e, i) => {
        newFd[`investment_${i}_name`] = e.name;
        newFd[`investment_${i}_value`] = e.value;
        newFd[`investment_${i}_month`] = e.month;
      });
      setFd(newFd);
      return next;
    });
  }

  /** Add a product card */
  function addProduct() {
    const id = `prod_${Date.now()}`;
    const idx = products.length;
    setProducts(prev => [...prev, { id, productName: '', retailPrice: 0, salePrice: 0, quantity: 0, qtyUnit: 'day', unitCost: 0, discountType: 'pct', discountValue: 0, discountScope: 'product' }]);
    setFd(prev => ({
      ...prev,
      [`product_${idx}_name`]: '',
      [`product_${idx}_retailPrice`]: 0,
      [`product_${idx}_salePrice`]: 0,
      [`product_${idx}_quantity`]: 0,
      [`product_${idx}_unitCost`]: 0,
    }));
  }

  /** Remove a product card */
  function removeProduct(id: string) {
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== id);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('product_')) delete newFd[key];
      }
      filtered.forEach((p, i) => {
        newFd[`product_${i}_name`] = p.productName;
        newFd[`product_${i}_retailPrice`] = p.retailPrice;
        newFd[`product_${i}_salePrice`] = p.salePrice;
        newFd[`product_${i}_quantity`] = p.quantity;
        newFd[`product_${i}_qtyUnit`] = p.qtyUnit || 'day';
        newFd[`product_${i}_unitCost`] = p.unitCost;
        newFd[`product_${i}_discountType`] = p.discountType;
        newFd[`product_${i}_discountValue`] = p.discountValue;
        newFd[`product_${i}_discountScope`] = p.discountScope;
      });
      setFd(newFd);
      return filtered;
    });
  }

  /** Add a staff card */
  function addStaff() {
    const id = `staff_${Date.now()}`;
    const idx = staffList.length;
    setStaffList(prev => [...prev, { id, staffName: '', salary: 0, bonusType: 'none', bonusValue: 0, staffCount: 1 }]);
    setFd(prev => ({
      ...prev,
      [`staff_${idx}_name`]: '',
      [`staff_${idx}_salary`]: 0,
      [`staff_${idx}_bonusType`]: 'none',
      [`staff_${idx}_bonusValue`]: 0,
      [`staff_${idx}_count`]: 1,
    }));
  }

  /** Remove a staff card */
  function removeStaff(id: string) {
    setStaffList(prev => {
      const filtered = prev.filter(s => s.id !== id);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('staff_')) delete newFd[key];
      }
      filtered.forEach((s, i) => {
        newFd[`staff_${i}_name`] = s.staffName;
        newFd[`staff_${i}_salary`] = s.salary;
        newFd[`staff_${i}_bonusType`] = s.bonusType;
        newFd[`staff_${i}_bonusValue`] = s.bonusValue;
        newFd[`staff_${i}_count`] = s.staffCount;
      });
      setFd(newFd);
      return filtered;
    });
  }

  /** Update a staff field */
  function updateStaff(id: string, field: keyof StaffItem, val: string | number) {
    setStaffList(prev => {
      const next = prev.map(s => s.id === id ? { ...s, [field]: val } : s);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('staff_')) delete newFd[key];
      }
      next.forEach((s, i) => {
        newFd[`staff_${i}_name`] = s.staffName;
        newFd[`staff_${i}_salary`] = s.salary;
        newFd[`staff_${i}_bonusType`] = s.bonusType;
        newFd[`staff_${i}_bonusValue`] = s.bonusValue;
        newFd[`staff_${i}_count`] = s.staffCount;
      });
      setFd(newFd);
      return next;
    });
  }

  function updateProduct(id: string, field: keyof ProductItem, val: string | number) {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, [field]: val } : p);
      const newFd = { ...fdRef.current };
      for (const key of Object.keys(newFd)) {
        if (key.startsWith('product_')) delete newFd[key];
      }
      next.forEach((p, i) => {
        newFd[`product_${i}_name`] = p.productName;
        newFd[`product_${i}_retailPrice`] = p.retailPrice;
        newFd[`product_${i}_salePrice`] = p.salePrice;
        newFd[`product_${i}_quantity`] = p.quantity;
        newFd[`product_${i}_qtyUnit`] = p.qtyUnit || 'day';
        newFd[`product_${i}_unitCost`] = p.unitCost;
        newFd[`product_${i}_discountType`] = p.discountType;
        newFd[`product_${i}_discountValue`] = p.discountValue;
        newFd[`product_${i}_discountScope`] = p.discountScope;
      });
      setFd(newFd);
      return next;
    });
  }

  const curMod = MODULES.find(m => m.id === selMod);
  const group = selBlock ? GROUP_BY_BLOCK[selBlock] : null;

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:th.bg }}>
      {/* ===== HEADER: лого + [название проекта] + [месяцы] + [рассчитать] ===== */}
      <header style={{
        height:42, display:'flex', alignItems:'center',
        padding:'0 12px', borderBottom:`1px solid ${th.cb}`,
        background:th.hb, flexShrink:0, gap:8,
      }}>
        {/* Logo / app name */}
        <span style={{ fontSize:13, fontWeight:700, color:th.tx, whiteSpace:'nowrap', marginRight:4 }}>
          ФЭМ-ассистент
        </span>

        {/* Project name — only when selected */}
        {selProject && (
          <>
            <div style={{
              flex:1, display:'flex', alignItems:'center', gap:6, justifyContent:'center',
              fontSize:12, fontWeight:500, color:th.tx,
            }}>
              <span style={{ maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {selProject.name}
              </span>
              {/* Months selector */}
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                style={{
                  padding:'2px 6px', borderRadius:4, border:`1px solid ${th.ib}`,
                  background:th.ibg, color:th.tx, fontSize:11, outline:'none', cursor:'pointer',
                }}
              >
                <option value={12}>12 мес</option>
                <option value={24}>24 мес</option>
                <option value={36}>36 мес</option>
              </select>
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              disabled={calculating}
              style={{
                padding:'4px 14px', fontSize:11, fontWeight:600,
                background:th.ac, color:'#fff', border:'none', borderRadius:6,
                cursor: calculating ? 'wait' : 'pointer',
                opacity: calculating ? 0.6 : 1,
                whiteSpace:'nowrap',
              }}
            >
              {calculating ? '⏳...' : '📊 Рассчитать'}
            </button>
          </>
        )}

        {/* Settings gear (always visible) */}
        <button
          onClick={() => setShowSt(true)}
          style={{
            background:'transparent', border:'none', cursor:'pointer',
            padding:4, display:'flex', flexShrink:0,
          }}
        >
          <IconSettings size={16} color={th.tm} />
        </button>
      </header>

      {/* BODY */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', background:th.bg }}>

        {/* ===== LEFT PANEL ===== */}
        <div style={{ width:leftR.width, borderRight:`1px solid ${th.cb}`, background:th.hb, padding:'8px 0', flexShrink:0, overflow:'hidden' }}>
          {MODULES.map(mod => {
            const I = M_ICONS[mod.iconName]||IconDashboard;
            const a = mod.id === selMod;
            return (
              <button key={mod.id} onClick={() => { setSelMod(mod.id); setSelBlock(null); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap: leftNarrow ? 0 : 8,
                  padding: leftNarrow ? '10px 0' : '7px 14px',
                  justifyContent: leftNarrow ? 'center' : 'flex-start',
                  background:a ? th.sec : 'transparent',
                  borderLeft:a ? `3px solid ${mod.color}` : '3px solid transparent',
                  borderTop:'none',borderRight:'none',borderBottom:'none',
                  cursor:'pointer', textAlign:'left', whiteSpace:'nowrap',
                }}>
                <I size={18} color={a?mod.color:th.td} />
                {!leftNarrow && <span style={{ fontSize:13, fontWeight:a?600:400, color:a?th.tx:th.tm }}>{mod.label}</span>}
              </button>
            );
          })}
        </div>
        <ResizeHandle {...leftR.dragHandle} />

        {/* ===== CENTER CANVAS ===== */}
        <div style={{ flex:1, background:th.can, position:'relative', overflow:'auto' }}>
          {/* ===== CONSTRUCTOR TOOLBAR ===== */}
          <div style={{ padding:'6px 10px', display:'flex', alignItems:'center', gap:6, borderBottom:`1px solid ${th.cb}`, background:th.hb, position:'sticky', top:0, zIndex:10 }}>
            <button onClick={() => setShowBlockMenu(true)}
              style={{ padding:'4px 10px', fontSize:11, fontWeight:600, background:th.ac, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              + Добавить блок
            </button>
            <span style={{ fontSize:10, color:th.tm }}>перетаскивайте блоки чтобы соединить</span>
          </div>

          {/* ===== BlockPanel конструктор ===== */}
          <BlockPanel blocks={blocks} setBlocks={setBlocks}
            selBlockId={selBlock} onSelect={setSelBlock}
            theme={th} />

          {curMod && (
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }}>
              {curMod.blocks.flatMap(b => b.connections.map((cId,i) => {
                const to = curMod.blocks.find(c => c.id === cId);
                if (!to) return null;
                const fk = `${curMod.id}/${b.id}`;
                const tk = `${curMod.id}/${cId}`;
                const fp = blockPositions.current[fk] || b;
                const tp = blockPositions.current[tk] || to;
                const fd = blockDims.current[fk];
                const td = blockDims.current[tk];
                const fw = fd ? fd.w : 160;
                const fh = fd ? fd.h : 48;
                const tw = td ? td.w : 160;
                const th2 = td ? td.h : 48;
                return <DraggableConnLine key={`${b.id}-${i}`} x1={fp.x + fw/2} y1={fp.y + fh/2} x2={tp.x + tw/2} y2={tp.y + th2/2} c={th.cb} />;
              }))}
            </svg>
          )}
          {curMod?.blocks.map(b => {
            const I = M_ICONS[b.iconName]||IconDashboard;
            const sel = b.id === selBlock;
            const key = `${curMod.id}/${b.id}`;
            const pos = blockPositions.current[key] || b;
            return (
              <div key={b.id} style={{ position:'absolute', left:pos.x, top:pos.y, width:160 }}
                onMouseDown={e => onBlockMouseDown(e, curMod.id, b.id)}
                ref={el => { if (el) blockDims.current[key] = { w: el.offsetWidth || 160, h: el.offsetHeight || 48 }; }}
              >
                <button onClick={() => setSelBlock(b.id)}
                  draggable={false}
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:8, cursor:'grab',
                    userSelect:'none',
                    border: sel ? `2px solid ${th.ac}` : `1px solid ${th.cb}`,
                    background: sel ? th.card : 'rgba(17,24,39,0.85)',
                    textAlign:'left', display:'flex', alignItems:'center', gap:8,
                    boxShadow: sel ? `0 0 16px rgba(37,99,235,0.15)` : '0 2px 6px rgba(0,0,0,0.2)',
                  }}>
                  <I size={16} color={b.color} />
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:th.tx }}>{b.label}</div>
                    <div style={{ fontSize:8, color:th.tm }}>{b.desc}</div>
                  </div>
                </button>
                <div style={{ position:'absolute', top:-10, left:80, width:8, height:8, borderRadius:'50%', background:th.ac, border:`2px solid ${th.can}`, zIndex:5 }} />
                <div style={{ position:'absolute', bottom:-10, left:80, width:8, height:8, borderRadius:'50%', background:th.ac, border:`2px solid ${th.can}`, zIndex:5 }} />
              </div>
            );
          })}
        </div>
        <ResizeHandle {...rightR.dragHandle} />

        {/* ===== RIGHT PANEL ===== */}
        <div style={{ width:rightR.width, background:th.card, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
          {group ? (
            <>
              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${th.cb}`, fontSize:13, fontWeight:600, color:th.tx, display:'flex', alignItems:'center', gap:6 }}>
                {rightNarrow && selBlock ? (() => {
                  const found = curMod?.blocks.find(b => b.id === selBlock);
                  const I = found ? (M_ICONS[found.iconName]||IconDashboard) : IconDashboard;
                  return <I size={16} color={found?.color||th.tm} />;
                })() : group.title}
              </div>
              {!rightNarrow && (
                <div style={{ flex:1, overflowY:'auto', padding:14 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {/* Fixed fields */}
                    {group.fields.map(f => {
                      const val = fd[f.key] ?? '';
                      const onChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
                        const raw = e.target.value;
                        const parsed = (f.type==='number'||f.type==='percent') ? (raw ? Number(raw) : '') : raw;
                        handleFieldChange(f.key, parsed);
                      };
                      return (
                        <div key={f.key}>
                          <label style={{ display:'block', fontSize:10, fontWeight:500, color:th.tm, marginBottom:2 }}>{f.label}</label>
                          {f.type === 'select' ? (
                            <select value={String(val)} onChange={onChange} onBlur={handleFieldBlur}
                              style={{ width:'100%', padding:'5px 8px', borderRadius:5, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }}>
                              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <div style={{ position:'relative' }}>
                              <input type="text" inputMode={f.type==='number'?'decimal':'text'}
                                value={val} onChange={onChange} onBlur={handleFieldBlur}
                                placeholder={f.placeholder}
                                style={{ width:'100%', padding:'5px 8px', paddingRight:f.type==='percent'?22:8, borderRadius:5, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }} />
                              {f.type==='percent' && <span style={{ position:'absolute', right:8, top:5, color:th.td, fontSize:11 }}>%</span>}
                            </div>
                          )}
                          {f.hint && <div style={{ fontSize:9, color:th.td, marginTop:1 }}>{f.hint}</div>}
                        </div>
                      );
                    })}

                    {/* Dynamic products */}
                    {group.dynamic === 'product' && (
                      <>
                        {products.length === 0 && (
                          <div style={{ fontSize:10, color:th.td, textAlign:'center', padding:'12px 0', border:`1px dashed ${th.ib}`, borderRadius:6 }}>
                            Нет продуктов. Добавьте первый продукт 👇
                          </div>
                        )}
                        {products.map((item) => {
                          const marginRub = item.salePrice > 0
                            ? (item.salePrice - item.unitCost) * item.quantity
                            : 0;
                          const marginPct = item.salePrice > 0
                            ? ((item.salePrice - item.unitCost) / item.salePrice * 100)
                            : null;
                          return (
                            <div key={item.id} style={{
                              background:th.sec,
                              borderRadius:8,
                              border:`1px solid ${th.cb}`,
                              padding:10,
                              display:'flex',
                              flexDirection:'column',
                              gap:6,
                            }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ fontSize:10, fontWeight:600, color:th.tx }}>Продукт</span>
                                <button
                                  onClick={() => removeProduct(item.id)}
                                  style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, fontSize:13, lineHeight:1, color:th.td }}
                                  title="Удалить продукт"
                                >
                                  🗑
                                </button>
                              </div>

                              {/* Поля продукта — 2 колонки */}
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Название</label>
                                  <input type="text" value={item.productName}
                                    onChange={e => updateProduct(item.id, 'productName', e.target.value)}
                                    placeholder="Grandorf 2кг"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>РРЦ</label>
                                  <input type="text" inputMode="decimal" value={item.retailPrice || ''}
                                    onChange={e => updateProduct(item.id, 'retailPrice', e.target.value ? Number(e.target.value) : 0)}
                                    placeholder="2000"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Цена реализации</label>
                                  <input type="text" inputMode="decimal" value={item.salePrice || ''}
                                    onChange={e => updateProduct(item.id, 'salePrice', e.target.value ? Number(e.target.value) : 0)}
                                    placeholder="1800"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Количество</label>
                                  <div style={{ display:'flex', gap:4 }}>
                                    <input type="text" inputMode="decimal" value={item.quantity || ''}
                                      onChange={e => updateProduct(item.id, 'quantity', e.target.value ? Number(e.target.value) : 0)}
                                      placeholder="10"
                                      style={{ flex:1, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                    />
                                    <select value={item.qtyUnit || 'day'}
                                      onChange={e => updateProduct(item.id, 'qtyUnit', e.target.value)}
                                      style={{ padding:'4px 4px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.bg, color:th.tx, fontSize:10, outline:'none' }}
                                    >
                                      <option value="day">в день</option>
                                      <option value="month">в мес</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Себестоимость ед.</label>
                                  <input type="text" inputMode="decimal" value={item.unitCost || ''}
                                    onChange={e => updateProduct(item.id, 'unitCost', e.target.value ? Number(e.target.value) : 0)}
                                    placeholder="1200"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                              </div>

                              {/* Блок скидки */}
                              <div style={{ display:'flex', gap:6, alignItems:'center', background:th.ibg, borderRadius:6, padding:'6px 8px', border:`1px solid ${th.ib}` }}>
                                <div style={{ flex:1 }}>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Скидка</label>
                                  <div style={{ display:'flex', gap:4 }}>
                                    <input type="text" inputMode="decimal" value={item.discountValue || ''}
                                      onChange={e => updateProduct(item.id, 'discountValue', e.target.value ? Number(e.target.value) : 0)}
                                      placeholder="0"
                                      style={{ width:60, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.bg, color:th.tx, fontSize:10, outline:'none' }}
                                    />
                                    <select value={item.discountType}
                                      onChange={e => updateProduct(item.id, 'discountType', e.target.value)}
                                      style={{ padding:'4px 4px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.bg, color:th.tx, fontSize:10, outline:'none' }}
                                    >
                                      <option value="pct">%</option>
                                      <option value="rub">₽</option>
                                    </select>
                                    <select value={item.discountScope}
                                      onChange={e => updateProduct(item.id, 'discountScope', e.target.value)}
                                      style={{ padding:'4px 4px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.bg, color:th.tx, fontSize:10, outline:'none' }}
                                    >
                                      <option value="product">На товар</option>
                                      <option value="all">На весь прайс</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Плашки маржинальности */}
                              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                                <div style={{
                                  flex:1, background:th.ibg, borderRadius:6, padding:'6px 8px',
                                  border:`1px solid ${th.ib}`,
                                }}>
                                  <div style={{ fontSize:8, color:th.td, marginBottom:1 }}>Маржа ₽/день</div>
                                  <div style={{ fontSize:13, fontWeight:700, color: item.salePrice > 0 ? '#34d399' : th.td }}>
                                    {item.salePrice > 0
                                      ? `${(marginRub).toLocaleString('ru-RU')} ₽`
                                      : '—'}
                                  </div>
                                </div>
                                <div style={{
                                  flex:1, background:th.ibg, borderRadius:6, padding:'6px 8px',
                                  border:`1px solid ${th.ib}`,
                                }}>
                                  <div style={{ fontSize:8, color:th.td, marginBottom:1 }}>Маржа %</div>
                                  <div style={{ fontSize:13, fontWeight:700, color: item.salePrice > 0 ? '#34d399' : th.td }}>
                                    {item.salePrice > 0 && marginPct !== null
                                      ? `${marginPct.toFixed(1)}%`
                                      : '—'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Кнопка добавления продукта */}
                        <button
                          onClick={addProduct}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                            padding:'7px 10px', fontSize:11, fontWeight:500,
                            background:'transparent', border:`1px dashed ${th.ib}`, borderRadius:6,
                            color:th.tm, cursor:'pointer', marginTop:2,
                          }}
                        >
                          ➕ Добавить продукт
                        </button>
                      </>
                    )}

                    {/* Dynamic expenses — two sections: variable + fixed */}
                    {group.dynamic === 'expense' && (
                      <>
                        {/* ===== Переменные расходы ===== */}
                        <div style={{ marginBottom:8, borderBottom:`1px solid ${th.cb}`, paddingBottom:8 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#f97316', marginBottom:6 }}>📈 Переменные (% от выручки или закупа)</div>
                          {varExpenses.length === 0 && (
                            <div style={{ fontSize:9, color:th.td, textAlign:'center', padding:'6px 0' }}>
                              Нет переменных расходов
                            </div>
                          )}
                          {varExpenses.map((item) => (
                            <div key={item.id} style={{ display:'flex', gap:4, alignItems:'center', marginBottom:5 }}>
                              <input type="text" value={item.name}
                                onChange={e => updateVarExpense(item.id, 'name', e.target.value)}
                                placeholder="Название"
                                style={{ flex:1, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                              />
                              <select value={item.type}
                                onChange={e => updateVarExpense(item.id, 'type', e.target.value)}
                                style={{ width:110, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                              >
                                <option value="revenue_pct">% выручки</option>
                                <option value="cogs_pct">% закупа</option>
                              </select>
                              <div style={{ position:'relative' }}>
                                <input type="text" inputMode="decimal" value={item.value || ''}
                                  onChange={e => updateVarExpense(item.id, 'value', e.target.value ? Number(e.target.value) : 0)}
                                  placeholder="5"
                                  style={{ width:60, padding:'4px 6px', paddingRight:16, borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                />
                                <span style={{ position:'absolute', right:4, top:4, color:th.td, fontSize:9 }}>%</span>
                              </div>
                              <button onClick={() => removeVarExpense(item.id)}
                                style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, fontSize:13, lineHeight:1 }}>
                                🗑
                              </button>
                            </div>
                          ))}
                          <button onClick={addVarExpense}
                            style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'3px 8px', fontSize:9, fontWeight:500,
                              background:'transparent', border:`1px dashed ${th.ib}`, borderRadius:4,
                              color:th.tm, cursor:'pointer', marginTop:2,
                            }}>
                            ➕ Переменный расход
                          </button>
                        </div>

                        {/* ===== Постоянные расходы ===== */}
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:'#3b82f6', marginBottom:6 }}>🏢 Постоянные (фикс. сумма/мес)</div>
                          {fixedExpenses.length === 0 && (
                            <div style={{ fontSize:9, color:th.td, textAlign:'center', padding:'6px 0' }}>
                              Нет постоянных расходов
                            </div>
                          )}
                          {fixedExpenses.map((item) => (
                            <div key={item.id} style={{ display:'flex', gap:4, alignItems:'center', marginBottom:5 }}>
                              <input type="text" value={item.name}
                                onChange={e => updateFixedExpense(item.id, 'name', e.target.value)}
                                placeholder="Аренда, софт..."
                                style={{ flex:1, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                              />
                              <input type="text" inputMode="decimal" value={item.value || ''}
                                onChange={e => updateFixedExpense(item.id, 'value', e.target.value ? Number(e.target.value) : 0)}
                                placeholder="50 000"
                                style={{ width:80, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                              />
                              <button onClick={() => removeFixedExpense(item.id)}
                                style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, fontSize:13, lineHeight:1 }}>
                                🗑
                              </button>
                            </div>
                          ))}
                          <button onClick={addFixedExpense}
                            style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'3px 8px', fontSize:9, fontWeight:500,
                              background:'transparent', border:`1px dashed ${th.ib}`, borderRadius:4,
                              color:th.tm, cursor:'pointer', marginTop:2,
                            }}>
                            ➕ Постоянный расход
                          </button>
                        </div>
                      </>
                    )}

                    {/* Dynamic staff */}
                    {group.dynamic === 'staff' && (
                      <>
                        {staffList.length === 0 && (
                          <div style={{ fontSize:10, color:th.td, textAlign:'center', padding:'12px 0', border:`1px dashed ${th.ib}`, borderRadius:6 }}>
                            Нет сотрудников. Добавьте первого 👇
                          </div>
                        )}
                        {staffList.map((item) => {
                          const totalBonus = item.bonusType === 'pct_of_salary'
                            ? item.salary * (item.bonusValue / 100)
                            : 0;
                          const totalSalary = (item.salary + totalBonus) * (item.staffCount || 1);
                          return (
                            <div key={item.id} style={{
                              background:th.sec,
                              borderRadius:8,
                              border:`1px solid ${th.cb}`,
                              padding:10,
                              display:'flex',
                              flexDirection:'column',
                              gap:6,
                            }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ fontSize:10, fontWeight:600, color:th.tx }}>Сотрудник</span>
                                <button
                                  onClick={() => removeStaff(item.id)}
                                  style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, fontSize:13, lineHeight:1, color:th.td }}
                                  title="Удалить сотрудника"
                                >
                                  🗑
                                </button>
                              </div>

                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                                <div style={{ gridColumn:'1 / -1' }}>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Должность</label>
                                  <input type="text" value={item.staffName}
                                    onChange={e => updateStaff(item.id, 'staffName', e.target.value)}
                                    placeholder="Менеджер"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Оклад</label>
                                  <input type="text" inputMode="decimal" value={item.salary || ''}
                                    onChange={e => updateStaff(item.id, 'salary', e.target.value ? Number(e.target.value) : 0)}
                                    placeholder="50 000"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Кол-во</label>
                                  <input type="text" inputMode="numeric" value={item.staffCount || 1}
                                    onChange={e => updateStaff(item.id, 'staffCount', e.target.value ? Number(e.target.value) : 1)}
                                    placeholder="1"
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Тип премии</label>
                                  <select value={item.bonusType}
                                    onChange={e => updateStaff(item.id, 'bonusType', e.target.value as any)}
                                    style={{ width:'100%', padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                  >
                                    <option value="none">Нет</option>
                                    <option value="pct_of_salary">% от оклада</option>
                                    <option value="pct_of_revenue">% от выручки</option>
                                  </select>
                                </div>
                                {item.bonusType !== 'none' && (
                                  <div>
                                    <label style={{ display:'block', fontSize:9, fontWeight:500, color:th.tm, marginBottom:1 }}>Премия %</label>
                                    <div style={{ position:'relative' }}>
                                      <input type="text" inputMode="decimal" value={item.bonusValue || ''}
                                        onChange={e => updateStaff(item.id, 'bonusValue', e.target.value ? Number(e.target.value) : 0)}
                                        placeholder="10"
                                        style={{ width:'100%', padding:'4px 6px', paddingRight:18, borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:10, outline:'none' }}
                                      />
                                      <span style={{ position:'absolute', right:5, top:3, color:th.td, fontSize:9 }}>%</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Итого ФОТ */}
                              <div style={{
                                background:th.ibg, borderRadius:6, padding:'5px 8px',
                                border:`1px solid ${th.ib}`, marginTop:2,
                              }}>
                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                  <span style={{ fontSize:8, color:th.td }}>ФОТ (мес):</span>
                                  <span style={{ fontSize:11, fontWeight:700, color:'#34d399' }}>
                                    {totalSalary.toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          onClick={addStaff}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                            padding:'7px 10px', fontSize:11, fontWeight:500,
                            background:'transparent', border:`1px dashed ${th.ib}`, borderRadius:6,
                            color:th.tm, cursor:'pointer', marginTop:2,
                          }}
                        >
                          ➕ Добавить сотрудника
                        </button>
                      </>
                    )}

                    {/* Dynamic investments */}
                    {group.dynamic === 'investment' && (
                      <>
                        <div style={{ borderTop:`1px solid ${th.cb}`, margin:'4px 0', paddingTop:8 }}>
                          <div style={{ fontSize:10, fontWeight:600, color:th.tm, marginBottom:6 }}>Дополнительные инвестиции</div>
                          {customInvestments.map((item) => (
                            <div key={item.id} style={{ display:'flex', gap:4, alignItems:'center', marginBottom:6 }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => updateCustomInvestment(item.id, 'name', e.target.value)}
                                placeholder="Название"
                                style={{ flex:1, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }}
                              />
                              <input
                                type="text" inputMode="decimal"
                                value={item.value || ''}
                                onChange={e => updateCustomInvestment(item.id, 'value', e.target.value ? Number(e.target.value) : 0)}
                                placeholder="Сумма"
                                style={{ width:80, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }}
                              />
                              <input
                                type="text" inputMode="numeric"
                                value={item.month}
                                onChange={e => updateCustomInvestment(item.id, 'month', e.target.value ? Number(e.target.value) : 1)}
                                placeholder="Мес"
                                style={{ width:40, padding:'4px 6px', borderRadius:4, border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }}
                              />
                              <button
                                onClick={() => removeCustomInvestment(item.id)}
                                style={{ background:'transparent', border:'none', cursor:'pointer', padding:2, fontSize:13, lineHeight:1 }}
                              >
                                🗑
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addCustomInvestment}
                            style={{
                              display:'flex', alignItems:'center', gap:4,
                              padding:'4px 10px', fontSize:10, fontWeight:500,
                              background:'transparent', border:`1px dashed ${th.ib}`, borderRadius:5,
                              color:th.tm, cursor:'pointer', marginTop:2,
                            }}
                          >
                            ➕ Добавить инвестицию
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {!rightNarrow && group.aiTip && (
                <div style={{ padding:'8px 14px', borderTop:`1px solid ${th.cb}`, background:th.sec, flexShrink:0 }}>
                  <div style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
                    <span style={{ fontSize:10, color:'#f97316' }}>🤖</span>
                    <span style={{ fontSize:9, color:th.tm, lineHeight:1.4 }}>{group.aiTip}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:th.td, fontSize:11 }}>Выберите блок</div>
          )}
        </div>
      </div>

      {/* ===== BOTTOM PROJECTS BAR ===== */}
      {projects.length > 0 && (
        <div style={{
          borderTop:`1px solid ${th.cb}`, background:th.hb,
          padding:'5px 10px', display:'flex', gap:4,
          flexWrap:'wrap', alignItems:'center', flexShrink:0,
          maxHeight:80, overflowY:'auto',
        }}>
          <span style={{
            fontSize:8, fontWeight:600, color:th.tm,
            letterSpacing:1, marginRight:4, flexShrink:0,
          }}>
            ПРОЕКТЫ
          </span>
          {projects.map(p => {
            const sel = selProject?.id === p.id;
            const createdDate = p.created_at
              ? new Date(p.created_at).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })
              : '';
            return (
              <div
                key={p.id}
                onClick={() => selectProject(p)}
                style={{
                  padding:'3px 8px', borderRadius:5, cursor:'pointer',
                  border: sel ? `1.5px solid ${th.ac}` : `1px solid ${th.cb}`,
                  background: sel ? th.sec : th.card,
                  display:'flex', alignItems:'center', gap:5,
                  fontSize:10, color:th.tx, flexShrink:0,
                  transition:'border-color 0.15s',
                }}
              >
                <span style={{ fontWeight:600, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ color:th.td, fontSize:9 }}>{createdDate}</span>
                <span
                  onClick={(e) => delP(p.id, e)}
                  style={{ cursor:'pointer', color:th.td, fontSize:10, lineHeight:1 }}
                  title="Удалить"
                >
                  🗑
                </span>
              </div>
            );
          })}

          {/* New project button */}
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding:'3px 8px', borderRadius:5, cursor:'pointer',
              border:`1px dashed ${th.ib}`, background:'transparent',
              display:'flex', alignItems:'center', gap:4,
              fontSize:10, color:th.tm, flexShrink:0,
            }}
          >
            + Новый проект
          </button>
        </div>
      )}

      {/* ===== NO PROJECTS — show standalone button ===== */}
      {projects.length === 0 && (
        <div style={{
          borderTop:`1px solid ${th.cb}`, background:th.hb,
          padding:'5px 10px', display:'flex', alignItems:'center', flexShrink:0,
        }}>
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding:'4px 12px', fontSize:11, fontWeight:600,
              background:th.ac, color:'#fff', border:'none', borderRadius:6,
              cursor:'pointer',
            }}
          >
            + Новый проект
          </button>
        </div>
      )}

      {/* ===== NEW PROJECT MODAL ===== */}
      {showNew && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
            zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
          }}
          onClick={() => setShowNew(false)}
        >
          <div
            style={{
              background:th.card, borderRadius:12, padding:20, width:320,
              border:`1px solid ${th.cb}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize:14, fontWeight:700, color:th.tx, marginBottom:14 }}>
              Новый проект
            </div>
            <label style={{ fontSize:10, color:th.tm, marginBottom:3, display:'block' }}>
              Название
            </label>
            <input
              value={nn}
              onChange={e => setNn(e.target.value)}
              placeholder="Сытые Носики"
              style={{
                width:'100%', padding:'6px 10px', borderRadius:6,
                border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx,
                fontSize:12, marginBottom:12,
              }}
            />
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, color:th.tm, marginBottom:3, display:'block' }}>
                  Валюта
                </label>
                <input
                  value={nc}
                  onChange={e => setNc(e.target.value)}
                  style={{
                    width:'100%', padding:'6px 10px', borderRadius:6,
                    border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx, fontSize:12,
                  }}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, color:th.tm, marginBottom:3, display:'block' }}>
                  Месяцев
                </label>
                <select
                  value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  style={{
                    width:'100%', padding:'6px 10px', borderRadius:6,
                    border:`1px solid ${th.ib}`, background:th.ibg, color:th.tx,
                    fontSize:12, outline:'none',
                  }}
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button
                onClick={() => setShowNew(false)}
                style={{
                  flex:1, padding:'7px 0', borderRadius:6, cursor:'pointer',
                  border:`1px solid ${th.cb}`, background:'transparent',
                  fontSize:12, color:th.tm, fontWeight:500,
                }}
              >
                Отмена
              </button>
              <button
                onClick={createP}
                disabled={!nn.trim()}
                style={{
                  flex:1, padding:'7px 0', borderRadius:6,
                  cursor: nn.trim() ? 'pointer' : 'not-allowed',
                  background: th.ac, color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  opacity: nn.trim() ? 1 : 0.5,
                }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SETTINGS MODAL ===== */}
      {showSt && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
            zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
          }}
          onClick={() => setShowSt(false)}
        >
          <div
            style={{
              background:th.card, borderRadius:12, padding:20, width:280,
              border:`1px solid ${th.cb}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize:14, fontWeight:700, color:th.tx, marginBottom:14 }}>
              ⚙️ Настройки
            </div>
            <div
              style={{
                display:'flex', alignItems:'center',
                justifyContent:'space-between', marginBottom:10,
              }}
            >
              <span style={{ fontSize:12, color:th.tx }}>Тема</span>
              <button
                onClick={() => {
                  const t = theme === 'dark' ? 'light' : 'dark';
                  setTheme(t);
                  localStorage.setItem('erp_theme', t);
                }}
                style={{
                  padding:'5px 12px', borderRadius:6, cursor:'pointer',
                  border:`1px solid ${th.cb}`, background:th.card,
                  color:th.tx, fontSize:12,
                }}
              >
                {theme === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}