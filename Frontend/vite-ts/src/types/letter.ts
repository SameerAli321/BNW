// ----------------------------------------------------------------------
// BNW OMS — Sprint 3 types, mirroring docs/API_CONTRACT_SPRINT3.md exactly (Letter engine). Keep
// in sync with that file; if either side needs to change this shape, update the contract doc
// first. Companion to src/types/user.ts (Sprint 1) and src/types/employee-record.ts (Sprint 2).

export type LetterType =
  | 'OFFER'
  | 'CONTRACT'
  | 'REDUNDANCY'
  | 'TERMS_CHANGE'
  | 'WARNING'
  | 'EXPERIENCE';

export const LETTER_TYPE_OPTIONS: LetterType[] = [
  'OFFER',
  'CONTRACT',
  'REDUNDANCY',
  'TERMS_CHANGE',
  'WARNING',
  'EXPERIENCE',
];

export type LetterStatus =
  | 'DRAFT'
  | 'PENDING_CEO'
  | 'CHANGES_REQUESTED'
  | 'CEO_SIGNED'
  | 'SENT_TO_EMPLOYEE'
  | 'SIGNED'
  | 'ARCHIVED'
  | 'CANCELLED';

export const LETTER_STATUS_OPTIONS: LetterStatus[] = [
  'DRAFT',
  'PENDING_CEO',
  'CHANGES_REQUESTED',
  'CEO_SIGNED',
  'SENT_TO_EMPLOYEE',
  'SIGNED',
  'ARCHIVED',
  'CANCELLED',
];

export type LetterEventAction =
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'CEO_SIGNED'
  | 'SENT_TO_EMPLOYEE'
  | 'EMPLOYEE_SIGNED'
  | 'CANCELLED';

/** `LetterFieldSchemaEntry` — contract §DTOs. One row of a template's `fieldsSchema`. */
export interface LetterFieldSchemaEntry {
  key: string;
  label: string;
  autoFilled: boolean;
}

/**
 * `LetterTemplateDto` — contract §DTOs. `bodyHtml` is intentionally omitted (see the contract's
 * comment) — not needed by the letter-creation UI (only `fieldsSchema`) or the detail UI (only the
 * rendered PDF).
 */
export interface LetterTemplateDto {
  id: number;
  type: LetterType;
  name: string;
  roleScope: string | null;
  fieldsSchema: LetterFieldSchemaEntry[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `POST /letter-templates` body — ADMIN only. */
export type CreateLetterTemplateDto = {
  type: LetterType;
  name: string;
  roleScope?: string | null;
  bodyHtml: string;
  fieldsSchema: LetterFieldSchemaEntry[];
  isActive?: boolean;
};

/**
 * `PUT /letter-templates/:id` body — ADMIN only. The backend treats `bodyHtml` as a genuine
 * partial-update field (`if (dto.bodyHtml !== undefined) template.bodyHtml = dto.bodyHtml`), so
 * it's optional here too — omit it to leave the stored body untouched (see
 * letter-template-new-edit-form.tsx, which never has the real current value to show/re-send).
 */
export type UpdateLetterTemplateDto = Omit<CreateLetterTemplateDto, 'bodyHtml'> & {
  bodyHtml?: string;
  version?: number;
};

/** `LetterEventDto` — contract §DTOs. One row of a letter's append-only audit trail. */
export interface LetterEventDto {
  id: number;
  action: LetterEventAction;
  actorId: number;
  actorName: string;
  comment: string | null;
  createdAt: string;
}

/** `SignatureDto` — contract §DTOs. */
export interface SignatureDto {
  id: number;
  signerId: number;
  signerName: string;
  signerRole: string;
  signedAt: string;
}

/** `LetterDto` — contract §DTOs. `events`/`signatures` are only present on `GET /letters/:id`. */
export interface LetterDto {
  id: number;
  templateId: number;
  templateName: string;
  type: LetterType;
  subjectUserId: number;
  subjectName: string;
  preparedBy: number;
  preparedByName: string;
  fieldValues: Record<string, string>;
  status: LetterStatus;
  hasPdf: boolean;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  events?: LetterEventDto[];
  signatures?: SignatureDto[];
}

/** `POST /letters` body — HR/ADMIN only. Creates a `DRAFT` letter. */
export type CreateLetterDto = {
  templateId: number;
  subjectUserId: number;
  fieldValues: Record<string, string>;
};

/** `PATCH /letters/:id` body — HR/ADMIN only, while `DRAFT`/`CHANGES_REQUESTED`. */
export type UpdateLetterDto = {
  fieldValues: Record<string, string>;
};

export type IListMeta = { total: number; page: number; limit: number };

export type ILetterTableFilters = {
  type: string;
  status: string;
};
