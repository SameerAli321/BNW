import { DocumentType } from '../../entities/document-type.entity';
import { EmployeeDocument } from '../../entities/employee-document.entity';
import { DocumentRequest } from '../../entities/document-request.entity';

export interface DocumentTypeDto {
  id: number;
  name: string;
}

export function toDocumentTypeDto(documentType: DocumentType): DocumentTypeDto {
  return { id: documentType.id, name: documentType.name };
}

export interface EmployeeDocumentDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string;
  originalName: string;
  mime: string;
  size: number;
  source: string;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
}

/**
 * Maps an EmployeeDocument entity to the API's EmployeeDocumentDto shape (per
 * API_CONTRACT_SPRINT2.md). Requires `documentType` and `uploadedByUser` relations to be loaded.
 */
export function toEmployeeDocumentDto(doc: EmployeeDocument): EmployeeDocumentDto {
  return {
    id: doc.id,
    userId: doc.userId,
    documentTypeId: doc.documentTypeId,
    documentTypeName: doc.documentType?.name ?? '',
    originalName: doc.originalName,
    mime: doc.mime,
    size: doc.size,
    source: doc.source,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByUser
      ? `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}`
      : '',
    createdAt: doc.createdAt.toISOString(),
  };
}

export interface DocumentRequestDto {
  id: number;
  userId: number;
  documentTypeId: number;
  documentTypeName: string;
  requestedBy: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

/**
 * Maps a DocumentRequest entity to the API's DocumentRequestDto shape. Requires the
 * `documentType` relation to be loaded.
 */
export function toDocumentRequestDto(request: DocumentRequest): DocumentRequestDto {
  return {
    id: request.id,
    userId: request.userId,
    documentTypeId: request.documentTypeId,
    documentTypeName: request.documentType?.name ?? '',
    requestedBy: request.requestedBy,
    status: request.status,
    dueDate: request.dueDate,
    createdAt: request.createdAt.toISOString(),
  };
}
