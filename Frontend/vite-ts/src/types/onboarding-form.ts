// ----------------------------------------------------------------------
// BNW OMS — Employee onboarding form types, mirroring the backend's OnboardingFormDto / request
// DTOs (Backend/src/common/mappers/onboarding-form.mapper.ts, Backend/src/onboarding-forms/dto).

export type OnboardingFormStatus = 'SUBMITTED' | 'RECORDED';

/** The fields the employee types in, in form order. */
export const ONBOARDING_FORM_FIELDS = [
  'dateOfBirth',
  'nationalId',
  'streetAddress',
  'city',
  'state',
  'zipCode',
  'phone',
  'reasonForLeaving',
  'workResponsibilities',
  'emergencyContactName',
  'emergencyContactRelationship',
  'emergencyContactPhone',
  'emergencyContactAddress',
  'bankName',
  'accountTitle',
  'accountNumber',
  'iban',
  'medicalCondition',
] as const;

export type OnboardingFormField = (typeof ONBOARDING_FORM_FIELDS)[number];

export type OnboardingFormDto = Record<OnboardingFormField, string | null> & {
  id: number;
  userId: number;
  // From the user record
  fullName: string;
  email: string;
  jobTitle: string | null;
  dateOfJoining: string | null;
  department: string | null;
  employeeCode: string | null;
  employeeSignatureText: string;
  employeeSignedAt: string;
  status: OnboardingFormStatus;
  hrRecordedTo: string | null;
  hrComments: string | null;
  hrUserName: string | null;
  hrSignatureText: string | null;
  hrSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface OnboardingFormListMeta {
  total: number;
  page: number;
  limit: number;
}

/** `GET /onboarding-forms/mine` — `data` is null until submitted; `prefill` comes from the E-record. */
export type MyOnboardingFormResponse = {
  data: OnboardingFormDto | null;
  prefill: Partial<Record<OnboardingFormField, string | null>>;
};

export type SubmitOnboardingFormDto = Partial<Record<OnboardingFormField, string>> & {
  acknowledged: boolean;
  signatureText: string;
};

export type OnboardingHrRecordDto = {
  recordedTo?: string;
  comments?: string;
  signatureText: string;
};
