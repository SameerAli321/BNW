import { Injectable } from '@nestjs/common';
import { AttendanceRegularization } from '../entities/attendance-regularization.entity';
import { AttendanceHrDecision } from '../common/enums/attendance-regularization.enum';
import { BnwFormPdf, formatFormDate } from '../common/pdf/bnw-form-pdf';

/** 'HH:MM' (24h) -> '9:40 AM'. */
function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Renders an attendance regularization as the HRD's paper "Regularization of Attendance Recorded
 * in HRD" form, with the HOD recommendation and HRD section filled in once they've acted.
 * Generated on demand — never stored.
 */
@Injectable()
export class AttendanceRegularizationPdfService {
  async render(row: AttendanceRegularization): Promise<Uint8Array> {
    const { employee, hod, hrUser } = row;
    const pdf = await BnwFormPdf.create(`Attendance Regularization #${row.id}`);

    pdf.text('HUMAN RESOURCE DEPARTMENT', {
      font: pdf.bold,
      size: 11,
      align: 'center',
      underline: true,
    });
    pdf.gap(10);
    pdf.text('Regularization of Attendance Recorded in HRD', { font: pdf.bold, align: 'center' });
    pdf.gap(14);
    pdf.text(`Date: ${formatFormDate(row.attendanceDate)}`, { font: pdf.bold, size: 8 });
    pdf.gap(10);

    pdf.labelTable([
      { label: 'Employee Code:', value: employee.employeeCode },
      { label: 'Employee Name:', value: `${employee.firstName} ${employee.lastName}` },
      { label: 'Designation:', value: employee.designation },
      { label: 'Department:', value: employee.department?.name ?? null },
      {
        cells: [
          { label: 'Time Arrival:', value: formatTime(row.timeArrival) },
          { label: 'Time Departure:', value: formatTime(row.timeDeparture) },
        ],
      },
      {
        label: 'Reasons for Late Arrival/ not Punching the Thumb / Hand / Card:',
        value: row.reason,
      },
      { label: 'Date of Submission:', value: formatFormDate(row.createdAt) },
    ]);

    // Recommendation of the Head of the Department
    pdf.gap(24);
    pdf.ensureSpace(130);
    pdf.rule();
    pdf.gap(4);
    pdf.text('Recommendation of the Head of the Department', {
      font: pdf.bold,
      size: 10,
      align: 'center',
    });
    pdf.gap(10);
    const recommendation =
      row.hodRecommended === false
        ? 'I do not recommend aforesaid regularization of attendance of the employee concerned'
        : 'I recommend aforesaid regularization of attendance of the employee concerned';
    pdf.text(recommendation, { size: 8 });
    if (row.hodRemarks) {
      pdf.gap(4);
      pdf.text(`Remarks: ${row.hodRemarks}`, { size: 8 });
    }
    pdf.gap(14);
    const left = pdf.margin + 40;
    const right = pdf.margin + pdf.contentWidth - 180;
    pdf.signatureLine(left, 130, {
      value: row.hodSignedAt ? formatFormDate(row.hodSignedAt) : null,
      captions: ['Date'],
    });
    const used = pdf.signatureLine(right, 180, {
      signature: row.hodSignatureText,
      captions: [
        'Signature of HOD/Business Unit Head',
        hod ? `${hod.firstName} ${hod.lastName}` : '',
      ],
    });
    pdf.gap(used + 20);

    // [For use by the HRD]
    pdf.ensureSpace(150);
    pdf.rule();
    pdf.gap(4);
    pdf.text('[For use by the HRD]', { font: pdf.bold, size: 8, align: 'center' });
    pdf.gap(12);
    pdf.option(
      row.hrDecision === AttendanceHrDecision.TAKEN_ON_RECORD,
      'The regularization has been recommended by the designated authority and hence taken on ' +
        'record, also received in time.',
    );
    pdf.option(
      row.hrDecision === AttendanceHrDecision.NOT_IN_ORDER,
      'The same is not in order Hence put up to HOD, HRD (P).',
    );
    if (row.hrRemarks) {
      pdf.text(`Remarks: ${row.hrRemarks}`, { size: 8 });
    }
    pdf.gap(10);
    pdf.signatureLine(right, 180, {
      signature: row.hrSignatureText,
      captions: [
        'Human Resource Department',
        [
          hrUser ? `${hrUser.firstName} ${hrUser.lastName}` : 'Name & Signature',
          formatFormDate(row.hrSignedAt),
        ]
          .filter(Boolean)
          .join(', '),
      ],
    });

    return pdf.save();
  }
}
