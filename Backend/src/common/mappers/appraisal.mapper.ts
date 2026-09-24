import { AppraisalRequest } from '../../entities/appraisal-request.entity';
import { AppraisalEvent } from '../../entities/appraisal-event.entity';

export interface AppraisalEventDto {
  id: number;
  action: string;
  actorId: number;
  actorName: string;
  message: string | null;
  createdAt: string;
}

/** Requires the `actor` relation to be loaded. */
export function toAppraisalEventDto(event: AppraisalEvent): AppraisalEventDto {
  return {
    id: event.id,
    action: event.action,
    actorId: event.actorId,
    actorName: event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : '',
    message: event.message,
    createdAt: event.createdAt.toISOString(),
  };
}

export interface AppraisalRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId: number | null;
  managerName: string | null;
  selfEvaluation: string;
  status: string;
  managerRemarks: string | null;
  managerMessage: string | null;
  managerDecision: string | null;
  managerDecidedAt: string | null;
  ceoRemarks: string | null;
  ceoMessage: string | null;
  ceoDecision: string | null;
  ceoDecidedAt: string | null;
  submittedAt: string;
  events?: AppraisalEventDto[];
}

/**
 * Requires the `employee`/`manager` relations to be loaded. `events` is only populated by the
 * caller for GET /appraisal-requests/:id, not the list endpoints — per
 * docs/API_CONTRACT_SPRINT4.md DTOs section.
 */
export function toAppraisalRequestDto(
  request: AppraisalRequest,
  extras?: { events?: AppraisalEventDto[] },
): AppraisalRequestDto {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: request.employee
      ? `${request.employee.firstName} ${request.employee.lastName}`
      : '',
    managerId: request.managerId,
    managerName: request.manager
      ? `${request.manager.firstName} ${request.manager.lastName}`
      : null,
    selfEvaluation: request.selfEvaluation,
    status: request.status,
    managerRemarks: request.managerRemarks,
    managerMessage: request.managerMessage,
    managerDecision: request.managerDecision,
    managerDecidedAt: request.managerDecidedAt ? request.managerDecidedAt.toISOString() : null,
    ceoRemarks: request.ceoRemarks,
    ceoMessage: request.ceoMessage,
    ceoDecision: request.ceoDecision,
    ceoDecidedAt: request.ceoDecidedAt ? request.ceoDecidedAt.toISOString() : null,
    submittedAt: request.submittedAt.toISOString(),
    ...(extras?.events ? { events: extras.events } : {}),
  };
}
