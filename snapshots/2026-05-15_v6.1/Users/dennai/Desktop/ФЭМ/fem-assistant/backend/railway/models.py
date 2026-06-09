"""Модель данных для ФЭМ-расчётов"""
from pydantic import BaseModel
from typing import List, Optional


class Assumptions(BaseModel):
    """Входящие параметры ФЭМ"""

    # Доходы
    target_revenue_per_day: float = 320  # Целевая выручка в день
    avg_check: float = 700  # Средний чек
    orders_per_day: float = 15  # Заказов в день
    ramp_month_1: float = 0.85  # Ramp-up мес 1
    ramp_month_2: float = 0.90  # Ramp-up мес 2
    ramp_month_3: float = 1.0  # Ramp-up мес 3+

    # Расходы
    cost_per_order: float = 0  # Себестоимость заказа
    payroll: float = 9000  # ФОТ в месяц
    acquiring_pct: float = 1.5  # Эквайринг %
    rent: float = 0  # Аренда склада
    marketing: float = 0  # Реклама
    logistics_per_order: float = 0  # Логистика на заказ
    other_expenses: float = 0  # Прочие расходы

    # Инвестиции
    reg_ip: float = 5000  # Регистрация ИП
    equipment: float = 50000  # Оборудование
    website: float = 0  # Сайт
    reserve_fund: float = 0  # Резервный фонд

    # Налоги
    tax_system: str = "USN_15"  # USN_6 | USN_15 | OSNO
    tax_rate: float = 0.15  # Ставка

    # Оборачиваемость
    inventory_days: float = 0  # Дни запаса
    supplier_deferral: float = 0  # Отсрочка поставщика
    customer_deferral: float = 0  # Отсрочка клиента


class ProjectData(BaseModel):
    """Проект с assumptions и расчётами"""
    id: str
    name: str
    assumptions: Assumptions
    pnl: Optional[List] = None
    cashflow: Optional[List] = None
    balance_sheet: Optional[List] = None
    ratios: Optional[List] = None
