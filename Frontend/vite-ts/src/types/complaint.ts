// ----------------------------------------------------------------------
// BNW OMS — Complaint form types, mirroring the backend's ComplaintDto / request DTOs
// (Backend/src/common/mappers/complaint.mapper.ts, Backend/src/complaints/dto).

export type ComplaintStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';

export const COMPLAINT_STATUS_OPTIONS: ComplaintStatus[] = ['SUBMITTED', 'IN_PROGRESS', 'RESOLVED'];

export interface ComplaintDto {
  id: number;
  complainantId: number;
  complainantName: string;
  complainantEmail: string;
  complainantDepartment: string | null;
  contactNumber: string | null;
  description: string | null;
  accessoryType: string | null;
  accessoryDescription: string | null;
  accessoryIssue: string | null;
  maintenanceArea: string | null;
  maintenanceDescription: string | null;
  status: ComplaintStatus;
  hrComments: string | null;
  hrActionRequested: string | null;
  hrAcknowledgement: string | null;
  hrSignatureText: string | null;
  hrRepresentativeId: number | null;
  hrRepresentativeName: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintListMeta {
  total: number;
  page: number;
  limit: number;
}

/** `POST /complaints` — at least one of the three sections must be filled in. */
export type CreateComplaintDto = {
  contactNumber?: string;
  description?: string;
  accessoryType?: string;
  accessoryDescription?: string;
  accessoryIssue?: string;
  maintenanceArea?: string;
  maintenanceDescription?: string;
};

/** `PATCH /complaints/:id/hr-response` — HR/ADMIN only; omitted fields are left unchanged. */
export type ComplaintHrResponseDto = {
  comments?: string;
  actionRequested?: string;
  acknowledgement?: string;
  signatureText?: string;
  status?: ComplaintStatus;
};
