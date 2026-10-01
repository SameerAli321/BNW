import { Injectable } from '@nestjs/common';
import { rgb } from 'pdf-lib';
import { OnboardingForm } from '../entities/onboarding-form.entity';
import { BnwFormPdf, formatFormDate } from '../common/pdf/bnw-form-pdf';

/**
 * Renders an onboarding form as BNW's paper "Employee Onboarding Form" (3 pages: personal +
 * employment; emergency contact, bank, medical; acknowledgment + HRD use only).
 */
@Injectable()
export class OnboardingFormPdfService {
  async render(form: OnboardingForm): Promise<Uint8Array> {
    const { user, hrUser } = form;
    const pdf = await BnwFormPdf.create(
      `Employee Onboarding Form - ${user.firstName} ${user.lastName}`,
    );

    pdf.text('EMPLOYEE ONBOARDING FORM', { font: pdf.bold, size: 11, align: 'center' });
    pdf.gap(16);

    const address = [
      `Street Address: ${form.streetAddress ?? ''}`,
      `City: ${form.city ?? ''}`,
      `State: ${form.state ?? ''}`,
      `Zip Code: ${form.zipCode ?? ''}`,
    ].join('\n');
    pdf.section('Personal Information', [
      { label: 'Full Name:', value: `${user.firstName} ${user.lastName}` },
      { label: 'Job Title Hired On:', value: user.designation },
      { label: 'Date of Birth:', value: formatFormDate(form.dateOfBirth) },
      { label: 'Social Security Number (if applicable):', value: form.nationalId },
      { label: 'Date of Joining:', value: formatFormDate(user.joinDate) },
      { label: 'Address Details:', value: address },
      { label: 'Phone Number:', value: form.phone },
      { label: 'Email Address:', value: user.email },
    ]);
    pdf.section('Employment Information', [
      { label: 'Reason for Leaving Previous Job:', value: form.reasonForLeaving },
      { label: 'Work Responsibilities:', value: form.workResponsibilities },
    ]);

    pdf.newPage();
    pdf.section('Emergency Contact Information', [
      { label: 'Emergency Contact Name:', value: form.emergencyContactName },
      { label: 'Relationship:', value: form.emergencyContactRelationship },
      { label: 'Phone Number:', value: form.emergencyContactPhone },
      { label: 'Address:', value: form.emergencyContactAddress },
    ]);
    pdf.section('Bank Details', [
      { label: 'Bank Name:', value: form.bankName },
      { label: 'Account Title:', value: form.accountTitle },
      { label: 'Account Number:', value: form.accountNumber },
      { label: 'IBAN:', value: form.iban },
    ]);
    pdf.section('Medical Information', [
      {
        label:
          "Is there any medical condition which might affect the employee's working capability (if any) kindly describe:",
        value: null,
      },
      { label: '', value: form.medicalCondition || 'None declared' },
    ]);
    pdf.noteBox(
      '"Note: Kindly attach your previous salary slip or any other evidence which prove your ' +
        'compensation from your last company."',
    );

    pdf.newPage();
    pdf.text('Acknowledgment:', { font: pdf.bold });
    pdf.gap(8);
    pdf.text(
      'I hereby certify that the information provided above is accurate and complete to the best ' +
        'of my knowledge. I understand that any false information provided may result in ' +
        'disciplinary action, up to and including termination of employment.',
    );
    pdf.gap(12);
    pdf.signatureLine(pdf.margin, 250, {
      signature: form.employeeSignatureText,
      captions: ['Employee Signature', `${user.firstName} ${user.lastName}`],
    });
    const used = pdf.signatureLine(pdf.margin + pdf.contentWidth - 150, 150, {
      value: formatFormDate(form.employeeSignedAt),
      captions: ['Date'],
    });
    pdf.gap(used + 30);

    pdf.section('HRD Use Only', [
      { label: 'Recorded To:', value: form.hrRecordedTo },
      { label: 'Comments:', value: form.hrComments },
      {
        cells: [
          {
            label: 'Signature:',
            signature: form.hrSignatureText,
            value: hrUser ? `${hrUser.firstName} ${hrUser.lastName}` : null,
          },
          { label: 'Date:', value: formatFormDate(form.hrSignedAt) },
        ],
      },
    ]);
    pdf.noteBox(
      'Please submit this form to your manager/supervisor for approval and forward a copy to the ' +
        'HR/Administration department for record-keeping.',
      true,
    );

    return pdf.save({
      text: 'BNW | Human Resource Department.',
      boxColor: rgb(0.78, 0.9, 0.62),
    });
  }
}
