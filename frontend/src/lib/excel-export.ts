/** Excel export for ФЭМ-ассистент */
import ExcelJS from 'exceljs';
import { runCalculation } from './engine';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } as const;
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };

export async function generateExcel(a: Record<string, any>): Promise<Buffer> {
  const data = runCalculation(a);
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Assumptions
  const ws = wb.addWorksheet('Assumptions');
  ws.columns = [
    { header: 'Параметр', key: 'param', width: 30 },
    { header: 'Значение', key: 'value', width: 20 },
  ];
  const rowsA = [
    ['Месяцев', a.months || 36],
    ['Инфляция месячная', a.monthly_inflation || 0],
    ['Товаров', (a.products || []).length],
    ['Налоговая система', a.taxSystem || a.tax_system || 'не указана'],
    ['Тип УСН', a.usnType || a.usn_type || 'income_minus_expenses'],
    ['ФОТ', parseFloat(a.payroll || '0')],
    ['Аренда', parseFloat(a.rent || '0')],
    ['Прочие расходы', parseFloat(a.other_expenses || '0')],
    ['Фикс. взносы ИП', parseFloat(a.ip_fixed_contrib || a.insurance_fixed || '59700')],
    ['Доп. взносы ИП 1%', parseFloat(a.ip_extra_contrib || a.ipExtraContrib || '0')],
    ['Эквайринг %', parseFloat(a.acquiring_pct || a.acquiringPct || '1.5')],
    ['Дни запаса', parseFloat(a.inventory_days || a.inventoryDays || '30')],
    ['Отсрочка поставщика (дн)', parseFloat(a.supplier_deferral || a.supplierDeferral || '0')],
    ['Отсрочка клиента (дн)', parseFloat(a.customer_deferral || a.customerDeferral || '0')],
  ];
  for (const [param, val] of rowsA) {
    ws.addRow([param, val]);
  }

  // Style header
  const r1 = ws.getRow(1);
  r1.font = HEADER_FONT as any;
  r1.fill = HEADER_FILL as any;
  r1.alignment = { horizontal: 'center' };

  const months = Array.from({ length: Math.min(36, data.pnl.revenue.length) }, (_, i) => `Мес ${i + 1}`);

  function writeTable(sheet: ExcelJS.Worksheet, title: string, rowsData: [string, number[]][]): void {
    sheet.addRow([]);
    sheet.addRow([title]);
    const titleRow = sheet.lastRow!;
    titleRow.font = { bold: true, size: 12 };

    const headerRow = sheet.addRow(['Показатель', ...months]);
    headerRow.font = HEADER_FONT as any;
    headerRow.fill = HEADER_FILL as any;
    headerRow.alignment = { horizontal: 'center' };

    for (const [label, values] of rowsData) {
      const row = sheet.addRow([label, ...values.slice(0, months.length).map(v => Math.round(v * 100) / 100)]);
      row.getCell(1).font = { bold: true };
      for (let c = 2; c <= months.length + 1; c++) {
        row.getCell(c).alignment = { horizontal: 'center' };
      }
    }
  }

  // Sheet 2: P&L
  const ws2 = wb.addWorksheet('P&L');
  const pnlData: [string, number[]][] = [
    ['Выручка', data.pnl.revenue],
    ['Скидки', data.pnl.discounts_total || []],
    ['Чистая выручка', data.pnl.net_revenue],
    ['Закуп', data.pnl.purchase_cogs],
    ['Переменные расходы', data.pnl.variable_extra],
    ['Валовая прибыль', data.pnl.gross_profit],
    ['Валовая маржа %', data.pnl.gross_margin],
    ['Постоянные расходы', data.pnl.fixed_costs],
    ['ФОТ + налоги', data.pnl.payroll_total],
    ['Итого постоянные', data.pnl.total_fixed],
    ['EBITDA', data.pnl.ebitda],
    ['Маржа EBITDA %', data.pnl.ebitda_margin],
    ['Амортизация', data.pnl.amortization],
    ['Налог', data.pnl.tax],
    ['Чистая прибыль', data.pnl.net_profit],
    ['Накопленная прибыль', data.pnl.cumulative_profit],
  ];
  writeTable(ws2, 'Отчёт о прибылях и убытках (P&L)', pnlData);

  // Sheet 3: Cash Flow
  const ws3 = wb.addWorksheet('Cash Flow');
  const cfData: [string, number[]][] = [
    ['Поступления', data.cashflow.operating_inflow],
    ['Платежи (-)', data.cashflow.operating_outflow],
    ['Чистый опер. поток', data.cashflow.net_operating],
    ['Инвестиции', data.cashflow.investing],
    ['Финансирование', data.cashflow.financing],
    ['ДС на начало', data.cashflow.cash_start],
    ['ДС на конец', data.cashflow.cash_end],
    ['ЧДПС', data.cashflow.net_cashflow],
  ];
  writeTable(ws3, 'Бюджет движения денежных средств', cfData);

  // Sheet 4: Balance Sheet
  const ws4 = wb.addWorksheet('Balance Sheet');
  const bsData: [string, number[]][] = [
    ['Денежные средства', data.balance_sheet.cash],
    ['Запасы', data.balance_sheet.inventory],
    ['Дебиторка', data.balance_sheet.receivables],
    ['Основные средства', data.balance_sheet.fixed_assets],
    ['Итого активы', data.balance_sheet.total_assets],
    ['Капитал', data.balance_sheet.capital],
    ['Кредиторка', data.balance_sheet.accounts_payable],
    ['Итого пассивы', data.balance_sheet.total_liabilities],
  ];
  writeTable(ws4, 'Баланс', bsData);

  // Sheet 5: Ratios
  const ws5 = wb.addWorksheet('Ratios');
  ws5.columns = [
    { header: 'Показатель', key: 'ratio', width: 40 },
    { header: 'Значение', key: 'value', width: 15 },
    { header: 'Норма', key: 'norm', width: 10 },
  ];
  ws5.addRow(['ROE (рентабельность капитала)', data.ratios.ROE, '> 15%']);
  ws5.addRow(['OPM (операционная маржа)', data.ratios.OPM, '> 10%']);
  ws5.addRow(['GPM (валовая маржа)', data.ratios.GPM, '> 20%']);
  ws5.addRow(['Проверка баланса', data.ratios.BalanceCheck, '0']);

  if (data.break_even) {
    ws5.addRow(['Точка безубыточности (заказов/мес)', data.break_even.break_even_orders, '']);
    ws5.addRow(['Постоянные расходы/мес', data.break_even.monthly_fixed, '']);
    ws5.addRow(['Маржа на единицу', data.break_even.margin_per_unit, '']);
  }

  const r5 = ws5.getRow(1);
  r5.font = HEADER_FONT as any;
  r5.fill = HEADER_FILL as any;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
