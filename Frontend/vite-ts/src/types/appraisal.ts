// ----------------------------------------------------------------------
// BNW OMS — Sprint 4 types, mirroring docs/API_CONTRACT_SPRINT4.md exactly (employee-initiated
// quarterly appraisal request flow — see that doc's "Deviation from the original guide" section;
// this is NOT the HR-scheduled cycle model from the original project guide §3.2/§5.2). Keep in
// sync with the contract; if either side needs to change this shape, update the contract doc
// first. Companion file to src/types/user.ts / employee-record.ts / letter.ts, not merged into
// any of them.

export type AppraisalStatus =
  | 'PENDING_MANAGER'
  | 'MANAGER_REJECTED'
  | 'PENDING_CEO'
  | 'CEO_ACCEPTED'
  | 'CEO_REJECTED';

export const APPRAISAL_STATUS_OPTIONS: AppraisalStatus[] = [
  'PENDING_MANAGER',
  'MANAGER_REJECTED',
  'PENDING_CEO',
  'CEO_ACCEPTED',
  'CEO_REJECTED',
];

export type AppraisalManagerDecision = 'ACCEPTED' | 'REJECTED';

export type AppraisalCeoDecision = 'ACCEPTED' | 'REJECTED' | 'SEND_BACK';

export type AppraisalEventAction =
  | 'SUBMITTED'
  | 'MANAGER_ACCEPTED'
  | 'MANAGER_REJECTED'
  | 'CEO_ACCEPTED'
  | 'CEO_REJECTED'
  | 'CEO_SENT_BACK';

/** `AppraisalEventDto` — contract §DTOs. One row of an appraisal's append-only audit trail. */
export interface AppraisalEventDto {
  id: number;
  action: AppraisalEventAction;
  actorId: number;
  actorName: string;
  message: string | null;
  createdAt: string;
}

/** `AppraisalRequestDto` — contract §DTOs. `events` is only present on `GET /appraisal-requests/:id`. */
export interface AppraisalRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId: number | null;
  managerName: string | null;
  selfEvaluation: string;
  status: AppraisalStatus;
  managerRemarks: string | null;
  managerMessage: string | null;
  managerDecision: AppraisalManagerDecision | null;
  managerDecidedAt: string | null;
  ceoRemarks: string | null;
  ceoMessage: string | null;
  ceoDecision: AppraisalCeoDecision | null;
  ceoDecidedAt: string | null;
  submittedAt: string;
  events?: AppraisalEventDto[];
}

/** `POST /appraisal-requests` body — self (anyone with a manager set). */
export type CreateAppraisalRequestDto = { selfEvaluation: string };

/** `POST /appraisal-requests/:id/manager-decision` body — the request's `managerId` only. */
export type ManagerDecisionDto = {
  remarks: string;
  message: string;
  decision: AppraisalManagerDecision;
};

/** `POST /appraisal-requests/:id/ceo-decision` body — CEO only. */
export type CeoDecisionDto = {
  remarks: string;
  message: string;
  decision: AppraisalCeoDecision;
};

export type MyAppraisalsMeta = { canRequestNext: boolean; nextEligibleDate: string | null };

/** `MyAppraisalsResponseDto` — contract §DTOs, the shape of `GET /appraisal-requests/mine`. */
export interface MyAppraisalsResponseDto {
  data: AppraisalRequestDto[];
  meta: MyAppraisalsMeta;
}

export type IAppraisalListMeta = { total: number; page: number; limit: number };

export type IAppraisalTableFilters = { status: string };
