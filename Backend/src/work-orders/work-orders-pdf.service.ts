import { Injectable } from '@nestjs/common';
import { WorkOrder } from '../entities/work-order.entity';
import { WorkOrderType } from '../common/enums/work-order.enum';
import { BnwFormPdf, formatFormDate } from '../common/pdf/bnw-form-pdf';
import { formatPkr } from './work-orders.service';

const name = (u: { firstName: string; lastName: string } | null | undefined) =>
  u ? `${u.firstName} ${u.lastName}` : '';

/**
 * A work order as a BNW form PDF — "Reimbursement Claim Form" or "Equipment Request Form", same
 * look as the other HR forms, with each approval section filled in once that person has acted.
 * Generated on demand — never stored.
 */
@Injectable()
export class WorkOrdersPdfService {
  async render(row: WorkOrder): Promise<Uint8Array> {
    const isReimbursement = row.type === WorkOrderType.REIMBURSEMENT;
    const title = isReimbursement ? 'Reimbursement Claim Form' : 'Equipment Request Form';
    const pdf = await BnwFormPdf.create(`${title} #${row.id}`);
    const { employee } = row;

    pdf.text(isReimbursement ? 'FINANCE / PAYROLL' : 'HUMAN RESOURCE DEPARTMENT', {
      font: pdf.bold,
      size: 11,
      align: 'center',
      underline: true,
    });
    pdf.gap(10);
    pdf.text(title, { font: pdf.bold, align: 'center' });
    pdf.gap(14);
    pdf.text(`Reference: WO-${row.id}  ·  Date submitted: ${formatFormDate(row.createdAt)}`, {
      font: pdf.bold,
      size: 8,
    });
    pdf.gap(10);

    pdf.labelTable([
      { label: 'Employee Code:', value: employee.employeeCode },
      { label: 'Employee Name:', value: name(employee) },
      { label: 'Designation:', value: employee.designation },
      { label: 'Department:', value: employee.department?.name ?? null },
      { label: isReimbursement ? 'Expense:' : 'Item:', value: row.title },
      { label: 'Category:', value: row.category },
      ...(isReimbursement
        ? [
            {
              cells: [
                { label: 'Amount Claimed:', value: formatPkr(row.amount) },
                { label: 'Date of Expense:', value: formatFormDate(row.expenseDate) },
              ],
            },
          ]
        : [
            {
              cells: [
                { label: 'Quantity:', value: String(row.quantity ?? 1) },
                { label: 'Needed By:', value: row.neededBy ? formatFormDate(row.neededBy) : null },
              ],
            },
            { label: 'Estimated Cost:', value: row.amount !== null ? formatPkr(row.amount) : null },
          ]),
      {
        label: isReimbursement ? 'Purpose / Details:' : 'Reason / Details:',
        value: row.description,
      },
      {
        label: isReimbursement ? 'Receipt Attached:' : 'Quotation Attached:',
        value: row.receiptOriginalName ? `Yes — ${row.receiptOriginalName}` : 'No',
      },
    ]);

    const left = pdf.margin + 40;
    const right = pdf.margin + pdf.contentWidth - 180;

    const approvalSection = (
      heading: string,
      decided: boolean | null,
      remarks: string | null,
      signature: string | null,
      signedAt: Date | null,
      caption: string,
      extra?: string | null,
    ) => {
      pdf.gap(20);
      pdf.ensureSpace(140);
      pdf.rule();
      pdf.gap(4);
      pdf.text(heading, { font: pdf.bold, size: 10, align: 'center' });
      pdf.gap(10);
      pdf.option(decided === true, 'Approved.');
      pdf.option(decided === false, 'Not approved.');
      if (extra) pdf.text(extra, { size: 8 });
      if (remarks) pdf.text(`Remarks: ${remarks}`, { size: 8 });
      pdf.gap(6);
      pdf.signatureLine(left, 130, {
        value: signedAt ? formatFormDate(signedAt) : null,
        captions: ['Date'],
      });
      pdf.gap(pdf.signatureLine(right, 180, { signature, captions: [caption] }));
    };

    if (row.managerId) {
      approvalSection(
        'Approval of the Line Manager',
        row.managerApproved,
        row.managerRemarks,
        row.managerSignatureText,
        row.managerSignedAt,
        `Line Manager${row.manager ? ` — ${name(row.manager)}` : ''}`,
      );
    }
    if (row.ceoRequired) {
      approvalSection(
        'Approval of the Chief Executive Officer',
        row.ceoApproved,
        row.ceoRemarks,
        row.ceoSignatureText,
        row.ceoSignedAt,
        `Chief Executive Officer${row.ceoUser ? ` — ${name(row.ceoUser)}` : ''}`,
      );
    }
    approvalSection(
      isReimbursement ? '[For use by Finance / Payroll]' : '[For use by the HRD]',
      row.processorApproved,
      row.processorRemarks,
      row.processorSignatureText,
      row.processedAt,
      `${isReimbursement ? 'Payroll' : 'Human Resource Department'}${row.processor ? ` — ${name(row.processor)}` : ''}`,
      row.processorReference
        ? `${isReimbursement ? 'Payment reference' : 'Asset tag / serial no.'}: ${row.processorReference}`
        : null,
    );

    return pdf.save();
  }
}
