import { LetterTemplate, LetterFieldSchemaEntry } from '../../entities/letter-template.entity';
import { Letter } from '../../entities/letter.entity';
import { LetterEvent } from '../../entities/letter-event.entity';
import { Signature } from '../../entities/signature.entity';

export interface LetterTemplateDto {
  id: number;
  type: string;
  name: string;
  roleScope: string | null;
  fieldsSchema: LetterFieldSchemaEntry[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * bodyHtml is intentionally omitted from the DTO — it's template source, not needed by the
 * letter-creation UI (fieldsSchema only) or the letter detail UI (rendered PDF only). Per
 * docs/API_CONTRACT_SPRINT3.md DTOs section.
 */
export function toLetterTemplateDto(template: LetterTemplate): LetterTemplateDto {
  return {
    id: template.id,
    type: template.type,
    name: template.name,
    roleScope: template.roleScope,
    fieldsSchema: template.fieldsSchema,
    version: template.version,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export interface LetterEventDto {
  id: number;
  action: string;
  actorId: number;
  actorName: string;
  comment: string | null;
  createdAt: string;
}

/** Requires the `actor` relation to be loaded. */
export function toLetterEventDto(event: LetterEvent): LetterEventDto {
  return {
    id: event.id,
    action: event.action,
    actorId: event.actorId,
    actorName: event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : '',
    comment: event.comment,
    createdAt: event.createdAt.toISOString(),
  };
}

export interface SignatureDto {
  id: number;
  signerId: number;
  signerName: string;
  signerRole: string;
  signedAt: string;
}

/** Requires the `signer` relation to be loaded. */
export function toSignatureDto(signature: Signature): SignatureDto {
  return {
    id: signature.id,
    signerId: signature.signerId,
    signerName: signature.signer
      ? `${signature.signer.firstName} ${signature.signer.lastName}`
      : '',
    signerRole: signature.signerRole,
    signedAt: signature.signedAt.toISOString(),
  };
}

export interface LetterDto {
  id: number;
  templateId: number;
  templateName: string;
  type: string;
  subjectUserId: number;
  subjectName: string;
  preparedBy: number;
  preparedByName: string;
  fieldValues: Record<string, string>;
  status: string;
  hasPdf: boolean;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  events?: LetterEventDto[];
  signatures?: SignatureDto[];
}

/**
 * Requires the `template`, `subjectUser`, `preparedByUser` relations to be loaded. `events`/
 * `signatures` are only populated by the caller for GET /letters/:id, not the list endpoint.
 */
export function toLetterDto(
  letter: Letter,
  extras?: { events?: LetterEventDto[]; signatures?: SignatureDto[] },
): LetterDto {
  return {
    id: letter.id,
    templateId: letter.templateId,
    templateName: letter.template?.name ?? '',
    type: letter.type,
    subjectUserId: letter.subjectUserId,
    subjectName: letter.subjectUser
      ? `${letter.subjectUser.firstName} ${letter.subjectUser.lastName}`
      : '',
    preparedBy: letter.preparedBy,
    preparedByName: letter.preparedByUser
      ? `${letter.preparedByUser.firstName} ${letter.preparedByUser.lastName}`
      : '',
    fieldValues: letter.fieldValues ?? {},
    status: letter.status,
    hasPdf: !!letter.pdfPath,
    currentVersion: letter.currentVersion,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
    ...(extras?.events ? { events: extras.events } : {}),
    ...(extras?.signatures ? { signatures: extras.signatures } : {}),
  };
}
