import { OnboardingForm } from '../../entities/onboarding-form.entity';

export interface OnboardingFormDto {
  id: number;
  userId: number;
  // From the user record
  fullName: string;
  email: string;
  jobTitle: string | null;
  dateOfJoining: string | null;
  department: string | null;
  employeeCode: string | null;
  // Personal information
  dateOfBirth: string | null;
  nationalId: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  // Employment information
  reasonForLeaving: string | null;
  workResponsibilities: string | null;
  // Emergency contact
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  // Bank details
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  // Medical
  medicalCondition: string | null;
  // Acknowledgment
  employeeSignatureText: string;
  employeeSignedAt: string;
  status: string;
  // HRD use only
  hrRecordedTo: string | null;
  hrComments: string | null;
  hrUserName: string | null;
  hrSignatureText: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Requires `user`, `user.department` and `hrUser` to be loaded. */
export function toOnboardingFormDto(form: OnboardingForm): OnboardingFormDto {
  const { user, hrUser } = form;
  return {
    id: form.id,
    userId: form.userId,
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email ?? '',
    jobTitle: user?.designation ?? null,
    dateOfJoining: user?.joinDate ?? null,
    department: user?.department?.name ?? null,
    employeeCode: user?.employeeCode ?? null,
    dateOfBirth: form.dateOfBirth,
    nationalId: form.nationalId,
    streetAddress: form.streetAddress,
    city: form.city,
    state: form.state,
    zipCode: form.zipCode,
    phone: form.phone,
    reasonForLeaving: form.reasonForLeaving,
    workResponsibilities: form.workResponsibilities,
    emergencyContactName: form.emergencyContactName,
    emergencyContactRelationship: form.emergencyContactRelationship,
    emergencyContactPhone: form.emergencyContactPhone,
    emergencyContactAddress: form.emergencyContactAddress,
    bankName: form.bankName,
    accountTitle: form.accountTitle,
    accountNumber: form.accountNumber,
    iban: form.iban,
    medicalCondition: form.medicalCondition,
    employeeSignatureText: form.employeeSignatureText,
    employeeSignedAt: form.employeeSignedAt.toISOString(),
    status: form.status,
    hrRecordedTo: form.hrRecordedTo,
    hrComments: form.hrComments,
    hrUserName: hrUser ? `${hrUser.firstName} ${hrUser.lastName}` : null,
    hrSignatureText: form.hrSignatureText,
    hrSignedAt: form.hrSignedAt ? form.hrSignedAt.toISOString() : null,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}
