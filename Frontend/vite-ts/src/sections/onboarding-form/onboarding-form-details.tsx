import type { LabelColor } from 'src/components/label';
import type { OnboardingFormDto, OnboardingFormStatus } from 'src/types/onboarding-form';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { HrFormField, HrFormSection } from 'src/sections/hr-forms/hr-form-section';

// ----------------------------------------------------------------------

const STATUS: Record<OnboardingFormStatus, { label: string; color: LabelColor }> = {
  SUBMITTED: { label: 'Waiting for HR', color: 'warning' },
  RECORDED: { label: 'Recorded by HR', color: 'success' },
};

export function OnboardingFormStatusLabel({ status }: { status: OnboardingFormStatus }) {
  return (
    <Label variant="soft" color={STATUS[status].color}>
      {STATUS[status].label}
    </Label>
  );
}

const signedBy = (signature: string | null, signedAt: string | null) =>
  signature ? `${signature}${signedAt ? ` — ${fDate(signedAt)}` : ''}` : null;

type Props = { form: OnboardingFormDto; hideHrSection?: boolean };

/** Every section of a submitted onboarding form, read-only, in paper-form order. */
export function OnboardingFormDetails({ form, hideHrSection }: Props) {
  const address = [form.streetAddress, form.city, form.state, form.zipCode]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <HrFormSection title="Personal Information">
        <HrFormField label="Full name" value={form.fullName} />
        <HrFormField label="Job title hired on" value={form.jobTitle} />
        <HrFormField label="Date of birth" value={form.dateOfBirth && fDate(form.dateOfBirth)} />
        <HrFormField label="CNIC / social security no." value={form.nationalId} />
        <HrFormField
          label="Date of joining"
          value={form.dateOfJoining && fDate(form.dateOfJoining)}
        />
        <HrFormField label="Address" value={address} />
        <HrFormField label="Phone number" value={form.phone} />
        <HrFormField label="Email address" value={form.email} />
      </HrFormSection>

      <HrFormSection title="Employment Information">
        <HrFormField label="Reason for leaving previous job" value={form.reasonForLeaving} />
        <HrFormField label="Work responsibilities" value={form.workResponsibilities} />
      </HrFormSection>

      <HrFormSection title="Emergency Contact Information">
        <HrFormField label="Name" value={form.emergencyContactName} />
        <HrFormField label="Relationship" value={form.emergencyContactRelationship} />
        <HrFormField label="Phone number" value={form.emergencyContactPhone} />
        <HrFormField label="Address" value={form.emergencyContactAddress} />
      </HrFormSection>

      <HrFormSection title="Bank Details">
        <HrFormField label="Bank name" value={form.bankName} />
        <HrFormField label="Account title" value={form.accountTitle} />
        <HrFormField label="Account number" value={form.accountNumber} />
        <HrFormField label="IBAN" value={form.iban} />
      </HrFormSection>

      <HrFormSection title="Medical Information">
        <HrFormField
          label="Medical condition affecting work"
          value={form.medicalCondition || 'None declared'}
        />
      </HrFormSection>

      <HrFormSection title="Acknowledgment">
        <HrFormField
          label="Employee signature"
          value={signedBy(form.employeeSignatureText, form.employeeSignedAt)}
        />
      </HrFormSection>

      {!hideHrSection && (
        <HrFormSection title="HRD Use Only">
          <HrFormField label="Recorded to" value={form.hrRecordedTo} />
          <HrFormField label="Comments" value={form.hrComments} />
          <HrFormField label="Signature" value={signedBy(form.hrSignatureText, form.hrSignedAt)} />
        </HrFormSection>
      )}
    </>
  );
}
