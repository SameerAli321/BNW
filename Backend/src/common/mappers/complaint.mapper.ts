import { Complaint } from '../../entities/complaint.entity';

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
  status: string;
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

/** Requires `complainant`, `complainant.department` and `hrRepresentative` to be loaded. */
export function toComplaintDto(complaint: Complaint): ComplaintDto {
  const { complainant, hrRepresentative } = complaint;
  return {
    id: complaint.id,
    complainantId: complaint.complainantId,
    complainantName: complainant ? `${complainant.firstName} ${complainant.lastName}` : '',
    complainantEmail: complainant?.email ?? '',
    complainantDepartment: complainant?.department?.name ?? null,
    contactNumber: complaint.contactNumber,
    description: complaint.description,
    accessoryType: complaint.accessoryType,
    accessoryDescription: complaint.accessoryDescription,
    accessoryIssue: complaint.accessoryIssue,
    maintenanceArea: complaint.maintenanceArea,
    maintenanceDescription: complaint.maintenanceDescription,
    status: complaint.status,
    hrComments: complaint.hrComments,
    hrActionRequested: complaint.hrActionRequested,
    hrAcknowledgement: complaint.hrAcknowledgement,
    hrSignatureText: complaint.hrSignatureText,
    hrRepresentativeId: complaint.hrRepresentativeId,
    hrRepresentativeName: hrRepresentative
      ? `${hrRepresentative.firstName} ${hrRepresentative.lastName}`
      : null,
    hrSignedAt: complaint.hrSignedAt ? complaint.hrSignedAt.toISOString() : null,
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
  };
}
