import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — work orders (reimbursement claims + equipment requests). Mirrors
// Backend/src/work-orders. Amounts are PKR.

export type WorkOrderType = 'REIMBURSEMENT' | 'EQUIPMENT';
export type WorkOrderStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_CEO'
  | 'PENDING_PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export const WORK_ORDER_STATUS_OPTIONS: WorkOrderStatus[] = [
  'PENDING_MANAGER',
  'PENDING_CEO',
  'PENDING_PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const WORK_ORDER_TYPE_LABEL: Record<WorkOrderType, string> = {
  REIMBURSEMENT: 'Reimbursement',
  EQUIPMENT: 'Equipment',
};

/** Who does the final step — mirrors the backend's PROCESSOR_ROLES. */
export const PROCESSOR_ROLES: Record<WorkOrderType, string[]> = {
  REIMBURSEMENT: ['PAYROLL', 'ADMIN'],
  EQUIPMENT: ['HR', 'ADMIN'],
};

export interface WorkOrderDto {
  id: number;
  type: WorkOrderType;
  title: string;
  category: string;
  description: string;
  amount: number | null;
  expenseDate: string | null;
  quantity: number | null;
  neededBy: string | null;
  hasReceipt: boolean;
  receiptOriginalName: string | null;
  status: WorkOrderStatus;
  ceoRequired: boolean;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  managerId: number | null;
  managerName: string | null;
  managerApproved: boolean | null;
  managerRemarks: string | null;
  managerSignatureText: string | null;
  managerSignedAt: string | null;
  ceoName: string | null;
  ceoApproved: boolean | null;
  ceoRemarks: string | null;
  ceoSignatureText: string | null;
  ceoSignedAt: string | null;
  processorName: string | null;
  processorApproved: boolean | null;
  processorRemarks: string | null;
  processorReference: string | null;
  processorSignatureText: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkOrderSettings = {
  ceoApprovalLimit: number;
  reimbursementCategories: string[];
  equipmentCategories: string[];
};

export type WorkOrderScope = 'queue' | 'mine' | 'team' | 'all';

export type WorkOrderQuery = {
  type?: WorkOrderType;
  status?: WorkOrderStatus;
  q?: string;
  page?: number;
  limit?: number;
};

export type WorkOrderDecision = { approved: boolean; remarks?: string; signatureText: string };

/** 'Rs 12,500' */
export function fPkr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const SCOPE_URL: Record<WorkOrderScope, string> = {
  queue: endpoints.workOrders.queue,
  mine: endpoints.workOrders.mine,
  team: endpoints.workOrders.team,
  all: endpoints.workOrders.list,
};

const revalidateWorkOrders = () =>
  mutate((key) => {
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.startsWith('/work-orders');
  });

// ----------------------------------------------------------------------

export function useGetWorkOrderSettings() {
  const { data, isLoading } = useSWR<{ data: WorkOrderSettings }>(
    endpoints.workOrders.settings,
    fetcher,
    swrOptions
  );
  return useMemo(() => ({ settings: data?.data, settingsLoading: isLoading }), [data?.data, isLoading]);
}

export async function updateWorkOrderSettings(ceoApprovalLimit: number): Promise<WorkOrderSettings> {
  const res = await axiosInstance.put(endpoints.workOrders.settings, { ceoApprovalLimit });
  await mutate(endpoints.workOrders.settings);
  return res.data.data;
}

export function useGetWorkOrders(scope: WorkOrderScope, query: WorkOrderQuery = {}, enabled = true) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  );
  const { data, isLoading } = useSWR<{
    data: WorkOrderDto[];
    meta: { total: number; page: number; limit: number };
  }>(enabled ? [SCOPE_URL[scope], { params }] : null, fetcher, swrOptions);
  return useMemo(
    () => ({
      workOrders: data?.data || [],
      workOrdersMeta: data?.meta,
      workOrdersLoading: isLoading,
    }),
    [data?.data, data?.meta, isLoading]
  );
}

export function useGetWorkOrder(id?: number | string) {
  const { data, isLoading, error } = useSWR<{ data: WorkOrderDto }>(
    id ? endpoints.workOrders.details(id) : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ workOrder: data?.data, workOrderLoading: isLoading, workOrderError: error }),
    [data?.data, isLoading, error]
  );
}

/** POST /work-orders — multipart, with an optional receipt / quotation file. */
export async function createWorkOrder(
  fields: Record<string, string | number | undefined>,
  receipt?: File | null
): Promise<WorkOrderDto> {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== '') form.append(key, String(value));
  });
  if (receipt) form.append('receipt', receipt);
  const res = await axiosInstance.post(endpoints.workOrders.list, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  await revalidateWorkOrders();
  return res.data.data;
}

async function decide(url: string, body: object): Promise<WorkOrderDto> {
  const res = await axiosInstance.post(url, body);
  await revalidateWorkOrders();
  return res.data.data;
}

export const submitWorkOrderManagerDecision = (id: number, body: WorkOrderDecision) =>
  decide(endpoints.workOrders.managerDecision(id), body);

export const submitWorkOrderCeoDecision = (id: number, body: WorkOrderDecision) =>
  decide(endpoints.workOrders.ceoDecision(id), body);

export const processWorkOrder = (id: number, body: WorkOrderDecision & { reference?: string }) =>
  decide(endpoints.workOrders.process(id), body);

export const cancelWorkOrder = (id: number) => decide(endpoints.workOrders.cancel(id), {});

export async function downloadWorkOrderPdf(id: number): Promise<void> {
  const res = await axiosInstance.get(endpoints.workOrders.pdf(id), { responseType: 'blob' });
  downloadBlob(res.data, `work-order-${id}.pdf`);
}

/** Opens the receipt / quotation in a new tab (it needs the auth header, so fetch as a blob). */
export async function openWorkOrderReceipt(id: number): Promise<void> {
  const res = await axiosInstance.get(endpoints.workOrders.receipt(id), { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}
