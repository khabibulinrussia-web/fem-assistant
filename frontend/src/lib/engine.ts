/** ФЭМ-ассистент — Financial Calculation Engine (TypeScript port of Python v6) */

export function pct(x: number): number {
  return Math.abs(x) >= 1 ? x / 100 : x;
}

export function inflationRate(x: number): number {
  return x > 0.1 ? x / 100 : x;
}

export function runCalculation(a: Record<string, any>): Record<string, any> {
  const MONTHS = Math.max(1, Math.min(360, parseInt(a.months || 36)));
  const INF = inflationRate(parseFloat(a.monthly_inflation || '0'));

  const RAMP_COEFFS = [0.05, 0.10, 0.18, 0.28, 0.40, 0.55, 0.72, 0.85];
  const T = parseFloat(a.target_orders || '0');
  const S = parseFloat(a.start_orders || '0');

  // === Products ===
  const products: any[] = a.products || [];
  const revenue: number[] = Array(MONTHS).fill(0);
  const purchase: number[] = Array(MONTHS).fill(0);
  const discountsTotal: number[] = Array(MONTHS).fill(0);
  const variableExtra: number[] = Array(MONTHS).fill(0);

  if (!products || !Array.isArray(products) || products.length === 0) {
    // Fallback: one product from flat fields
    const ourPrice = parseFloat(a.our_price || '0') || 10350;
    const purchaseCost = parseFloat(a.purchase_cost || '0');
    const deliveryToClient = parseFloat(a.delivery_to_client || '0');
    const deliveryCost = parseFloat(a.delivery_cost || '0');
    const discountPct = pct(parseFloat(a.discount_pct || '0'));

    const targetOrders = T || parseFloat(a.targetOrders || '320');
    const startOrders = S || parseFloat(a.startOrders || '15');

    for (let m = 0; m < MONTHS; m++) {
      const coeff = m < 8 ? RAMP_COEFFS[m] : 1.0;
      const q = Math.round(targetOrders * coeff + (1 - coeff) * startOrders);
      const disc = Math.round(ourPrice * discountPct * 100) / 100;
      revenue[m] = Math.round(q * (ourPrice + deliveryToClient) * 100) / 100;
      purchase[m] = Math.round(q * purchaseCost * Math.pow(1 + INF, m) * 100) / 100;
    }
  } else {
    // Products array — quantity-driven with ramp-up
    for (const prod of products) {
      const qtyDay = parseFloat(prod.quantity || '0');
      if (qtyDay <= 0) continue;
      const monthlyQty = qtyDay * 30;
      const salePrice = parseFloat(prod.salePrice || prod.retailPrice || '0');
      const cogsUnit = parseFloat(prod.unitCost || prod.cogs || '0');
      const discType: string = prod.discountType || '';
      const discVal = parseFloat(prod.discountValue || '0');
      const rampMonths = parseInt(prod.rampupMonths || '1');
      const rampStart = Math.max(0, parseInt(prod.rampupStartMonth || '1') - 1);

      let discPerMonth = 0;
      let effectivePrice = salePrice;
      if (discType === 'pct' && discVal > 0) {
        discPerMonth = monthlyQty * salePrice * discVal / 100;
        effectivePrice = salePrice * (1 - discVal / 100);
      } else if (discType === 'rub' && discVal > 0) {
        discPerMonth = monthlyQty * discVal;
        effectivePrice = salePrice - discVal;
      }

      for (let m = 0; m < MONTHS; m++) {
        let rampFactor = 1.0;
        if (m >= rampStart && m < rampStart + rampMonths) {
          rampFactor = (m - rampStart + 1) / rampMonths;
        } else if (m < rampStart) {
          rampFactor = 0;
        }
        const qtyThisMonth = monthlyQty * rampFactor;
        revenue[m] += Math.round(qtyThisMonth * salePrice * 100) / 100;
        purchase[m] += Math.round(qtyThisMonth * cogsUnit * Math.pow(1 + INF, m) * 100) / 100;
        discountsTotal[m] += Math.round(discPerMonth * rampFactor * 100) / 100;
      }
    }
  }

  // Acquiring
  const acquiringPct = pct(parseFloat(a.acquiring_pct || a.acquiringPct || '1.5'));
  const acquiring = revenue.map(r => Math.round(r * acquiringPct * 100) / 100);

  // === Fixed expenses ===
  const fixedExpenses: any[] = a.fixedExpenses || a.fixed_expenses || a.expenses || [];
  let fixedSum = 0;
  if (Array.isArray(fixedExpenses)) {
    for (const e of fixedExpenses) {
      if (!e || typeof e !== 'object') continue;
      const unit: string = e.unit || 'rub';
      const amount = parseFloat(e.value || e.amount || '0') || 0;
      fixedSum += unit === 'pcs' ? amount * (parseFloat(e.pricePerUnit || '0') || 0) : amount;
    }
  }
  fixedSum += parseFloat(a.payroll || '0');
  fixedSum += parseFloat(a.rent || '0');
  fixedSum += parseFloat(a.other_expenses || '0');

  // === Variable expenses ===
  const varExpenses: any[] = a.varExpenses || a.var_expenses || [];
  if (Array.isArray(varExpenses)) {
    for (const e of varExpenses) {
      if (!e || typeof e !== 'object') continue;
      const unit: string = e.unit || e.type || '';
      const val = parseFloat(e.value || e.amount || '0') || 0;
      if (val === 0) continue;
      const scope: string = e.scope || '';
      const targetProductId: string = e.productId || '';

      // Find target product
      let targetProd: any = null;
      if (scope === 'product' && targetProductId && Array.isArray(products)) {
        targetProd = products.find((p: any) => p.id === targetProductId) || null;
      }

      if (unit === 'pct' || unit === 'revenue_pct') {
        for (let m = 0; m < MONTHS; m++) {
          let base = 0;
          if (targetProd) {
            base = rampedRevenue(targetProd, m);
          } else if (scope === 'all_revenue') {
            base = products.length > 0 ? revenue[m] : revenue[m];
          }
          variableExtra[m] += Math.round(base * val / 100 * 100) / 100;
        }
      } else if (unit === 'rub_per_unit' || unit === 'rub_unit') {
        for (let m = 0; m < MONTHS; m++) {
          let totalQty = 0;
          if (targetProd) {
            totalQty = rampedQty(targetProd, m);
          } else if (scope === 'all_revenue') {
            totalQty = products.reduce((sum: number, p: any) => sum + rampedQty(p, m), 0);
          }
          variableExtra[m] += val * totalQty;
        }
      } else {
        // Fixed amount per month
        for (let m = 0; m < MONTHS; m++) {
          variableExtra[m] += val;
        }
      }
    }
  }

  // === Custom blocks (личный блок) ===
  const customBlocks: any[] = a.customBlocks || [];
  if (Array.isArray(customBlocks)) {
    for (const cb of customBlocks) {
      if (!cb || typeof cb !== 'object') continue;
      const val = parseFloat(cb.value || '0') || 0;
      if (val === 0) continue;
      const valueType: string = cb.valueType || 'rub';
      const period: string = cb.period || 'month';
      const attachTo: string = cb.attachTo || 'income';
      const productId: string = cb.productId || '';

      // Convert to monthly value
      let monthlyVal = val;
      if (period === 'day') monthlyVal = val * 30;
      else if (period === 'year') monthlyVal = val / 12;

      // Find target product if specified
      let targetProd: any = null;
      if (attachTo === 'expenses' && productId && Array.isArray(products)) {
        targetProd = products.find((p: any) => p.id === productId) || null;
      }

      if (attachTo === 'income') {
        // Добавляем к выручке
        for (let m = 0; m < MONTHS; m++) {
          if (valueType === 'pct') {
            // Процент от текущей выручки
            const baseRevenue = products.length > 0 ? revenue[m] : revenue[m];
            revenue[m] += Math.round(baseRevenue * monthlyVal / 100 * 100) / 100;
          } else {
            // Фиксированная сумма
            let addVal = monthlyVal;
            if (targetProd) {
              // Если привязан к продукту — доля от его выручки
              const prodRev = rampedRevenue(targetProd, m);
              if (prodRev > 0 && revenue[m] > 0) {
                addVal = monthlyVal * (prodRev / revenue[m]);
              }
            }
            revenue[m] += Math.round(addVal * 100) / 100;
          }
        }
      } else if (attachTo === 'expenses') {
        if (targetProd) {
          // Влияет на себестоимость продукта
          for (let m = 0; m < MONTHS; m++) {
            const qty = rampedQty(targetProd, m);
            if (qty > 0) {
              const perUnit = monthlyVal / Math.max(1, qty);
              purchase[m] += Math.round(perUnit * qty * 100) / 100;
            } else {
              purchase[m] += Math.round(monthlyVal * 100) / 100;
            }
          }
        } else {
          // Без привязки к продукту — в переменные расходы
          for (let m = 0; m < MONTHS; m++) {
            if (valueType === 'pct') {
              // Процент от общей выручки
              variableExtra[m] += Math.round(revenue[m] * monthlyVal / 100 * 100) / 100;
            } else {
              variableExtra[m] += Math.round(monthlyVal * 100) / 100;
            }
          }
        }
      }
    }
  }

  // Net revenue (after discounts)
  const netRevenue: number[] = products.length > 0
    ? revenue.map((r, m) => Math.round((r - discountsTotal[m]) * 100) / 100)
    : [...revenue];

  // Total variable costs
  const totalVar: number[] = purchase.map((p, m) => Math.round((p + variableExtra[m]) * 100) / 100);

  // Gross profit
  const grossProfit: number[] = netRevenue.map((nr, m) =>
    Math.round((nr - purchase[m] - variableExtra[m]) * 100) / 100
  );

  // Fixed costs (with inflation)
  const fixedCosts: number[] = Array.from({ length: MONTHS }, (_, m) =>
    Math.round(fixedSum * Math.pow(1 + INF, m) * 100) / 100
  );

  // === Staff & payroll ===
  const staff: any[] = a.staff || [];
  let staffTotal = 0;
  if (Array.isArray(staff)) {
    for (const s of staff) {
      if (!s || typeof s !== 'object') continue;
      const salary = parseFloat(s.salary || '0');
      const count = parseFloat(s.headcount || s.count || '1');
      staffTotal += salary * count;
    }
  }

  const payrollTaxRate = 0.15;
  const hasStaff = Array.isArray(staff) && staff.length > 0;

  const payrollMonthly: number[] = [];
  const payrollSalary: number[] = [];
  const payrollTaxes: number[] = [];

  for (let m = 0; m < MONTHS; m++) {
    const basePayroll = staffTotal * Math.pow(1 + INF, m);
    const taxes = staffTotal * payrollTaxRate * Math.pow(1 + INF, m);
    let total = basePayroll + taxes;
    if (hasStaff) {
      const insuranceFixed = parseFloat(a.ip_fixed_contrib || a.insurance_fixed || '59700');
      const insurance1pct = parseFloat(a.ip_extra_contrib || a.ipExtraContrib || a.insurance_1pct || '0');
      total += insuranceFixed / 12 + insurance1pct / 12;
    }
    payrollSalary.push(Math.round(basePayroll * 100) / 100);
    payrollTaxes.push(Math.round(taxes * 100) / 100);
    payrollMonthly.push(Math.round(total * 100) / 100);
  }

  // Total fixed: if staff exists, use payrollMonthly; otherwise flat fields only
  const totalFixed: number[] = Array.from({ length: MONTHS }, (_, m) =>
    Math.round((fixedCosts[m] + (hasStaff ? payrollMonthly[m] : 0)) * 100) / 100
  );

  // === Investments with amortization ===
  const rawInvestments: any[] = a.investments || a.customInvestments || a.investments_list || [];
  const invArray: any[] = Array.isArray(rawInvestments) ? rawInvestments : [];
  const investing: number[] = Array(MONTHS).fill(0);
  const amortization: number[] = Array(MONTHS).fill(0);
  let totalInvCost = 0;

  for (const inv of invArray) {
    if (!inv || typeof inv !== 'object') continue;
    const invAmount = parseFloat(inv.amount || inv.value || '0') || 0;
    if (invAmount <= 0) continue;
    const startMonth = Math.max(0, (parseInt(inv.startMonth || inv.month || '1') - 1));
    const amortMonths = Math.max(1, parseInt(inv.amortMonths || inv.depreciation || '36'));
    if (startMonth < MONTHS) {
      investing[startMonth] -= invAmount;
    }
    totalInvCost += invAmount;
    const monthlyAmort = Math.round(invAmount / amortMonths * 100) / 100;
    for (let am = 0; am < amortMonths; am++) {
      const idx = startMonth + am;
      if (idx < MONTHS) amortization[idx] += monthlyAmort;
    }
  }

  // EBITDA
  const ebitda: number[] = grossProfit.map((gp, m) =>
    Math.round((gp - totalFixed[m]) * 100) / 100
  );

  // === Tax ===
  const taxSystem: string = a.taxSystem || a.tax_system || '';
  let tax: number[];
  if (!taxSystem) {
    tax = Array(MONTHS).fill(0);
  } else {
    const usnType: string = a.usnType || a.usn_type || 'income_minus_expenses';
    const rate = usnType === 'income' ? 0.06 : 0.15;
    const minTaxRate = 0.01;
    tax = Array.from({ length: MONTHS }, (_, m) => {
      let t: number;
      if (usnType === 'income') {
        t = Math.max(revenue[m] * rate, 0);
      } else {
        t = Math.max(ebitda[m] * rate, revenue[m] * minTaxRate, 0);
      }
      return Math.round(t * 100) / 100;
    });
  }

  // Net profit
  const netProfit: number[] = ebitda.map((e, m) =>
    Math.round((e - amortization[m] - tax[m]) * 100) / 100
  );
  const cumulativeProfit: number[] = [];
  let running = 0;
  for (const p of netProfit) {
    running += p;
    cumulativeProfit.push(Math.round(running * 100) / 100);
  }

  const ebitdaMargin: number[] = ebitda.map((e, m) =>
    revenue[m] > 0 ? Math.round(e / revenue[m] * 100 * 100) / 100 : 0
  );

  // === Cash Flow ===
  const opInflow = revenue;
  const opOutflow: number[] = purchase.map((p, m) =>
    Math.round((p + variableExtra[m] + fixedCosts[m] + tax[m]) * 100) / 100
  );
  const netOp: number[] = opInflow.map((o, m) =>
    Math.round((o - opOutflow[m]) * 100) / 100
  );

  const financing: number[] = Array(MONTHS).fill(0);
  const cashStart: number[] = Array(MONTHS).fill(0);
  const cashEnd: number[] = Array(MONTHS).fill(0);

  for (let m = 0; m < MONTHS; m++) {
    const cf = netOp[m] + investing[m];
    const start = m > 0 ? cashEnd[m - 1] : 0;
    if (start + cf < 0) {
      financing[m] = Math.round(-(start + cf) * 100) / 100;
    }
    cashStart[m] = Math.round(start * 100) / 100;
    cashEnd[m] = Math.round((start + cf + financing[m]) * 100) / 100;
  }

  const netCF: number[] = cashEnd.map((ce, m) =>
    Math.round((ce - cashStart[m]) * 100) / 100
  );

  // === Balance Sheet ===
  const arDays = parseFloat(a.customer_deferral || a.customerDeferral || a.accountsReceivableDays || '0');
  const apDays = parseFloat(a.supplier_deferral || a.supplierDeferral || a.accountsPayableDays || '0');
  const invDays = parseFloat(a.inventory_days || a.inventoryDays || '30');

  const ar: number[] = revenue.map(r => Math.round(r * arDays / 30 * 100) / 100);
  const ap: number[] = purchase.map(p => Math.round(p * apDays / 30 * 100) / 100);
  const inventory: number[] = purchase.map(p => Math.round(p * invDays / 30 * 100) / 100);

  let accumAmort = 0;
  const fixedAssets: number[] = Array.from({ length: MONTHS }, (_, m) => {
    accumAmort += amortization[m];
    return Math.round(Math.max(totalInvCost - accumAmort, 0) * 100) / 100;
  });

  const totalAssets: number[] = cashEnd.map((ce, m) =>
    Math.round((ce + inventory[m] + fixedAssets[m] + ar[m]) * 100) / 100
  );
  const capital: number[] = totalAssets.map((ta, m) =>
    Math.round((ta - ap[m]) * 100) / 100
  );
  const totalLiabilities: number[] = capital.map((c, m) =>
    Math.round((c + ap[m]) * 100) / 100
  );

  // === Ratios (last 12 months) ===
  const yStart = Math.max(0, MONTHS - 12);
  const yLen = Math.min(12, MONTHS);
  const yRev = revenue.slice(yStart, yStart + yLen).reduce((a, b) => a + b, 0);
  const yNp = netProfit.slice(yStart, yStart + yLen).reduce((a, b) => a + b, 0);
  const yCogs = purchase.slice(yStart, yStart + yLen).reduce((a, b) => a + b, 0);
  const yAssetsAvg = (totalAssets[yStart] + totalAssets[totalAssets.length - 1]) / 2;
  const yEquityAvg = (capital[yStart] + capital[capital.length - 1]) / 2;

  const ratios = {
    ROE: yEquityAvg ? Math.round(yNp / yEquityAvg * 100 * 100) / 100 : 0,
    OPM: yRev ? Math.round(yNp / yRev * 100 * 100) / 100 : 0,
    GPM: yRev ? Math.round((yRev - yCogs) / yRev * 100 * 100) / 100 : 0,
    BalanceCheck: Math.round((totalAssets[totalAssets.length - 1] - totalLiabilities[totalLiabilities.length - 1]) * 100) / 100,
  };

  // === Break-even ===
  const avgPayroll = hasStaff ? (payrollMonthly.reduce((a, b) => a + b, 0) / MONTHS) : 0;
  const avgFixed = (hasStaff ? fixedSum : fixedSum) + avgPayroll + acquiring.reduce((a, b) => a + b, 0) / MONTHS;

  let totalUnits = 0;
  let totalMargin = 0;
  if (Array.isArray(products)) {
    for (const prod of products) {
      const qtyDay = parseFloat(prod.quantity || '0');
      if (qtyDay <= 0) continue;
      const monthlyQty = qtyDay * 30;
      const salePrice = parseFloat(prod.salePrice || prod.retailPrice || '0');
      const cogsUnit = parseFloat(prod.unitCost || prod.cogs || '0');
      const discType: string = prod.discountType || '';
      const discVal = parseFloat(prod.discountValue || '0');
      let effPrice = salePrice;
      if (discType === 'pct' && discVal > 0) effPrice = salePrice * (1 - discVal / 100);
      else if (discType === 'rub' && discVal > 0) effPrice = salePrice - discVal;
      totalUnits += monthlyQty;
      totalMargin += (effPrice - cogsUnit) * monthlyQty;
    }
  }
  const marginPerUnit = totalUnits > 0 ? totalMargin / totalUnits : 0;
  const beOrders = marginPerUnit > 0 ? Math.round(avgFixed / marginPerUnit) : 0;

  return {
    assumptions: a,
    pnl: {
      revenue,
      purchase_cogs: purchase,
      variable_extra: variableExtra,
      gross_profit: grossProfit,
      gross_margin: netRevenue.map((nr, m) => nr > 0 ? Math.round(grossProfit[m] / nr * 100 * 100) / 100 : 0),
      fixed_costs: fixedCosts,
      salary: payrollSalary,
      payroll_taxes: payrollTaxes,
      payroll_total: payrollMonthly,
      total_fixed: totalFixed,
      amortization,
      ebitda,
      ebitda_margin: ebitdaMargin,
      tax,
      net_profit: netProfit,
      cumulative_profit: cumulativeProfit,
      discounts_total: products.length > 0 ? discountsTotal : [],
      net_revenue: netRevenue,
      total_variable: totalVar,
    },
    cashflow: {
      operating_inflow: opInflow,
      operating_outflow: opOutflow,
      net_operating: netOp,
      investing,
      financing,
      cash_start: cashStart,
      cash_end: cashEnd,
      net_cashflow: netCF,
    },
    balance_sheet: {
      cash: cashEnd,
      inventory,
      receivables: ar,
      fixed_assets: fixedAssets,
      total_assets: totalAssets,
      capital,
      accounts_payable: ap,
      total_liabilities: totalLiabilities,
    },
    ratios,
    break_even: {
      monthly_fixed: Math.round(avgFixed * 100) / 100,
      break_even_orders: beOrders,
      margin_per_unit: Math.round(marginPerUnit * 100) / 100,
    },
  };
}

// === Helper functions ===

function rampedQty(prod: Record<string, any>, month: number): number {
  const qtyDay = parseFloat(prod.quantity || '0');
  if (qtyDay <= 0) return 0;
  const monthlyQty = qtyDay * 30;
  const rampMonths = parseInt(prod.rampupMonths || '1');
  const rampStart = Math.max(0, parseInt(prod.rampupStartMonth || '1') - 1);
  let rampFactor = 1.0;
  if (month >= rampStart && month < rampStart + rampMonths) {
    rampFactor = (month - rampStart + 1) / rampMonths;
  } else if (month < rampStart) {
    rampFactor = 0;
  }
  return monthlyQty * rampFactor;
}

function rampedRevenue(prod: Record<string, any>, month: number): number {
  const qty = rampedQty(prod, month);
  const price = parseFloat(prod.salePrice || prod.retailPrice || '0');
  return qty * price;
}

// === v2: run_from_graph ===

export function runFromGraph(graph: Record<string, any>): Record<string, any> {
  const blocks: any[] = graph.blocks || [];
  const settings: Record<string, any> = graph.settings || {};

  const a: Record<string, any> = {};
  a.months = parseInt(settings.months || graph.months || '12');
  a.monthly_inflation = parseFloat(settings.monthly_inflation || '0');

  const products: any[] = [];
  const staffList: any[] = [];
  const fixedExpenses: any[] = [];
  const varExpenses: any[] = [];
  const investments: any[] = [];

  let arDays = 0, apDays = 0, invDays = 0;
  let taxSystem = 'usn', usnType = 'income_minus_expenses';
  const creditData: Record<string, any> = {};
  let ipFixedContrib = 59700;
  let ipExtraContrib = 0;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const blkType: string = block.type || '';
    const props: Record<string, any> = block.props || {};
    const children: string[] = block.children || [];

    if (blkType === 'product') {
      const prod: Record<string, any> = {
        name: props.name || '',
        retailPrice: parseFloat(props.retailPrice || '0'),
        salePrice: parseFloat(props.salePrice || '0'),
        quantity: parseFloat(props.quantity || '0'),
        unitCost: parseFloat(props.unitCost || '0'),
      };

      for (const childId of children) {
        const child = blocks.find((b: any) => b.id === childId);
        if (child) {
          const ctype: string = child.type || '';
          const cprops: Record<string, any> = child.props || {};
          if (ctype === 'discount') {
            prod.discountType = cprops.discountType || 'pct';
            prod.discountValue = parseFloat(cprops.discountValue || '0');
            prod.discountScope = cprops.discountScope || 'product';
          } else if (ctype === 'rampup') {
            prod.rampupMonths = parseInt(cprops.months || '3');
            prod.rampupStartMonth = parseInt(cprops.startMonth || '1');
          }
        }
      }
      products.push(prod);
    } else if (blkType === 'staff') {
      staffList.push({
        name: props.name || '',
        salary: parseFloat(props.salary || '0'),
        count: parseFloat(props.count || '1'),
        bonusType: props.bonusType || '',
        bonusValue: parseFloat(props.bonusValue || '0'),
      });
    } else if (blkType === 'expense_fixed') {
      fixedExpenses.push({
        name: props.name || '',
        value: parseFloat(props.value || '0'),
      });
    } else if (blkType === 'expense_var') {
      varExpenses.push({
        name: props.name || '',
        type: props.type || 'revenue_pct',
        value: parseFloat(props.value || '0'),
      });
    } else if (blkType === 'investment') {
      investments.push({
        name: props.name || '',
        amount: parseFloat(props.amount || '0'),
        month: parseInt(props.month || '1'),
        depreciation: parseInt(props.depreciation || '0'),
      });
    } else if (blkType === 'tax') {
      taxSystem = props.taxSystem || 'usn';
      usnType = props.usnType || 'income_minus_expenses';
    } else if (blkType === 'ar_ap') {
      arDays = parseInt(props.arDays || '0');
      apDays = parseInt(props.apDays || '0');
      invDays = parseInt(props.invDays || '0');
    } else if (blkType === 'credit') {
      creditData.amount = parseFloat(props.amount || '0');
      creditData.rate = parseFloat(props.rate || '0');
      creditData.term = parseInt(props.term || '12');
      creditData.month = parseInt(props.month || '1');
    } else if (blkType === 'settings') {
      a.months = parseInt(props.months || a.months);
      a.monthly_inflation = parseFloat(props.inflation || a.monthly_inflation);
      ipFixedContrib = parseFloat(props.ipFixedContrib || props.ip_fixed_contrib || '59700');
      ipExtraContrib = parseFloat(props.ipExtraContrib || props.ip_extra_contrib || '0');
    }
  }

  if (products.length > 0) a.products = products;
  if (staffList.length > 0) a.staff = staffList;
  if (fixedExpenses.length > 0) a.fixedExpenses = fixedExpenses;
  if (varExpenses.length > 0) a.varExpenses = varExpenses;
  if (investments.length > 0) a.investments = investments;
  a.taxSystem = taxSystem;
  a.usnType = usnType;
  if (arDays > 0) a.customer_deferral = arDays;
  if (apDays > 0) a.supplier_deferral = apDays;
  if (invDays > 0) a.inventory_days = invDays;
  if (creditData.amount > 0) a.credit = creditData;
  // Custom blocks from graph
  const customBlocks: any[] = [];
  for (const block of blocks) {
    if (!block || block.type !== 'custom') continue;
    const props = block.props || {};
    const val = parseFloat(props.value || '0') || 0;
    if (val <= 0) continue;
    customBlocks.push({
      name: block.name || props.name || 'Личный блок',
      value: val,
      valueType: props.valueType || 'rub',
      period: props.period || 'month',
      attachTo: props.attachTo || 'income',
      productId: null,
    });
  }
  if (customBlocks.length > 0) a.customBlocks = customBlocks;

  a.ip_fixed_contrib = ipFixedContrib;
  a.ip_extra_contrib = ipExtraContrib;
  a.start_orders = 0;
  a.target_orders = 0;

  return runCalculation(a);
}
