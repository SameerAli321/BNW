import { Injectable } from '@nestjs/common';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveBalanceDto } from '../common/mappers/leave.mapper';
import { BnwFormPdf, formatFormDate } from '../common/pdf/bnw-form-pdf';

/**
 * Renders a leave request as a BNW "Leave Application Form" — same look as the HRD's paper
 * attendance regularization form (no paper leave form was supplied), with the line manager and
 * HRD sections filled in once they've acted. Generated on demand — never stored.
 */
@Injectable()
export class LeavePdfService {
  async render(row: LeaveRequest, balance: LeaveBalanceDto | null): Promise<Uint8Array> {
    const { employee, manager, hrUser } = row;
    const pdf = await BnwFormPdf.create(`Leave Application #${row.id}`);

    pdf.text('HUMAN RESOURCE DEPARTMENT', {
      font: pdf.bold,
      size: 11,
      align: 'center',
      underline: true,
    });
    pdf.gap(10);
    pdf.text('Leave Application Form', { font: pdf.bold, align: 'center' });
    pdf.gap(14);
    pdf.text(`Date of Application: ${formatFormDate(row.createdAt)}`, { font: pdf.bold, size: 8 });
    pdf.gap(10);

    const year = row.startDate.slice(0, 4);
    const balanceText = !balance
      ? null
      : balance.annualQuota === null
        ? `No limit — ${balance.used} day(s) taken in ${year}`
        : `${balance.annualQuota} per year · ${balance.used} taken · ${balance.pending} pending · ` +
          `${balance.remaining} remaining (${year})`;

    pdf.labelTable([
      { label: 'Employee Code:', value: employee.employeeCode },
      { label: 'Employee Name:', value: `${employee.firstName} ${employee.lastName}` },
      { label: 'Designation:', value: employee.designation },
      { label: 'Department:', value: employee.department?.name ?? null },
      { label: 'Type of Leave:', value: row.leaveType.name },
      {
        cells: [
          { label: 'From:', value: formatFormDate(row.startDate) },
          { label: 'To:', value: formatFormDate(row.endDate) },
        ],
      },
      {
        label: 'No. of Days:',
        value: row.halfDay ? '0.5 (half day)' : `${row.days} working day(s)`,
      },
      { label: 'Reason for Leave:', value: row.reason },
      { label: 'Contact During Leave:', value: row.contactDuringLeave },
      { label: 'Leave Balance:', value: balanceText },
    ]);

    // Approval of the line manager
    const left = pdf.margin + 40;
    const right = pdf.margin + pdf.contentWidth - 180;
    pdf.gap(24);
    pdf.ensureSpace(150);
    pdf.rule();
    pdf.gap(4);
    pdf.text('Approval of the Line Manager', { font: pdf.bold, size: 10, align: 'center' });
    pdf.gap(10);
    if (!row.managerId) {
      pdf.text('No line manager on record — sent directly to the HRD.', { size: 8 });
    } else {
      pdf.option(row.managerApproved === true, 'Leave recommended / approved.');
      pdf.option(row.managerApproved === false, 'Leave not approved.');
      if (row.managerRemarks) pdf.text(`Remarks: ${row.managerRemarks}`, { size: 8 });
      pdf.gap(6);
      pdf.signatureLine(left, 130, {
        value: row.managerSignedAt ? formatFormDate(row.managerSignedAt) : null,
        captions: ['Date'],
      });
      const used = pdf.signatureLine(right, 180, {
        signature: row.managerSignatureText,
        captions: [
          'Signature of Line Manager',
          manager ? `${manager.firstName} ${manager.lastName}` : '',
        ],
      });
      pdf.gap(used);
    }

    // [For use by the HRD]
    pdf.gap(20);
    pdf.ensureSpace(150);
    pdf.rule();
    pdf.gap(4);
    pdf.text('[For use by the HRD]', { font: pdf.bold, size: 8, align: 'center' });
    pdf.gap(12);
    pdf.option(
      row.hrApproved === true,
      "Leave approved and recorded in the employee's holiday record.",
    );
    pdf.option(row.hrApproved === false, 'Leave not approved.');
    if (row.hrRemarks) pdf.text(`Remarks: ${row.hrRemarks}`, { size: 8 });
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
