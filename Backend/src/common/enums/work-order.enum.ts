export enum WorkOrderType {
  /** Money the employee already spent — Payroll pays it back. */
  REIMBURSEMENT = 'REIMBURSEMENT',
  /** Something the employee needs (laptop, headset, chair…) — HR / Admin issue it. */
  EQUIPMENT = 'EQUIPMENT',
}

/**
 * Employee → line manager → (CEO, only when the amount is over the limit) → processing
 * (Payroll pays a reimbursement / HR or Admin issue equipment) → COMPLETED.
 */
export enum WorkOrderStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_CEO = 'PENDING_CEO',
  PENDING_PROCESSING = 'PENDING_PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export const REIMBURSEMENT_CATEGORIES = [
  'Travel',
  'Fuel',
  'Meals',
  'Client entertainment',
  'Office supplies',
  'Training / courses',
  'Mobile / internet',
  'Other',
] as const;

export const EQUIPMENT_CATEGORIES = [
  'Laptop / computer',
  'Monitor',
  'Keyboard / mouse',
  'Headset',
  'Mobile phone',
  'Furniture',
  'Software / licence',
  'Stationery',
  'Other',
] as const;
