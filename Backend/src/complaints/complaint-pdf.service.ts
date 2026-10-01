import { Injectable } from '@nestjs/common';
import { rgb } from 'pdf-lib';
import { Complaint } from '../entities/complaint.entity';
import { BnwFormPdf, FORM_COLORS, formatFormDate } from '../common/pdf/bnw-form-pdf';

/**
 * Renders a complaint as the BNW paper "Complaint Form" (bordered sections with shaded headers),
 * filled in with the submitted values and HR's response. Generated on demand — never stored.
 */
@Injectable()
export class ComplaintPdfService {
  async render(complaint: Complaint): Promise<Uint8Array> {
    const c = complaint;
    const complainant = c.complainant;
    const pdf = await BnwFormPdf.create(`Complaint Form #${c.id}`);

    pdf.text('COMPLAINT FORM', { font: pdf.bold, size: 11, align: 'center' });
    pdf.gap(10);
    pdf.text(`Reference #${c.id}`, { size: 8, color: FORM_COLORS.grey });
    pdf.gap(14);

    pdf.section('Employee Information', [
      { label: 'Name:', value: `${complainant.firstName} ${complainant.lastName}` },
      { label: 'Department:', value: complainant.department?.name ?? null },
      {
        cells: [
          { label: 'Contact Number:', value: c.contactNumber },
          { label: 'Email:', value: complainant.email },
        ],
      },
      { label: 'Date:', value: formatFormDate(c.createdAt) },
    ]);
    pdf.section('Complaint Details', [
      { label: 'Description of Complaint:', value: c.description },
    ]);
    pdf.section('Office Accessories', [
      { label: 'Accessory Type:', value: c.accessoryType },
      { label: 'Description:', value: c.accessoryDescription },
      { label: 'Issue:', value: c.accessoryIssue },
    ]);

    // Page 2 starts at Maintenance Issue, like the paper form.
    pdf.newPage();
    pdf.section('Maintenance Issue', [
      { label: 'Area/Equipment:', value: c.maintenanceArea },
      { label: 'Description of Issue:', value: c.maintenanceDescription },
    ]);
    const hrSignedCaption = [
      c.hrRepresentative ? `${c.hrRepresentative.firstName} ${c.hrRepresentative.lastName}` : null,
      c.hrSignedAt ? `signed ${formatFormDate(c.hrSignedAt)}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    pdf.section('Human Resource Department Only', [
      { label: 'Comments:', value: c.hrComments },
      { label: 'Action Requested:', value: c.hrActionRequested },
      { label: 'Acknowledgement/Receiving:', value: c.hrAcknowledgement },
      {
        label: 'Representative Signature:',
        signature: c.hrSignatureText,
        value: hrSignedCaption || null,
      },
    ]);

    pdf.noteBox(
      'Please submit this form to your manager/supervisor for approval and forward a copy to the ' +
        'HR/Administration department for record-keeping.',
      true,
    );

    return pdf.save({
      text: 'BNW Consultants | Human Resource Department',
      boxColor: rgb(0.8, 0.6, 0.6),
    });
  }
}
