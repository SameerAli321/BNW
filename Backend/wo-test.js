"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const work_orders_pdf_service_1 = require("./src/work-orders/work-orders-pdf.service");
const work_order_enum_1 = require("./src/common/enums/work-order.enum");
const emp = { firstName: 'Ayesha', lastName: 'Khan', employeeCode: 'BNW-014', designation: 'Audit Associate', department: { name: 'Operations' } };
const base = { id: 7, employee: emp, managerId: 3, manager: { firstName: 'Sara', lastName: 'Ahmed' }, managerApproved: true, managerRemarks: 'Client visit confirmed.', managerSignatureText: 'Sara Ahmed', managerSignedAt: new Date(), ceoRequired: true, ceoUser: { firstName: 'Bilal', lastName: 'Noor' }, ceoApproved: true, ceoRemarks: null, ceoSignatureText: 'Bilal Noor', ceoSignedAt: new Date(), processor: { firstName: 'Pay', lastName: 'Roll' }, processorApproved: true, processorRemarks: 'Paid with October salary', processorReference: 'TRX-88231', processorSignatureText: 'Pay Roll', processedAt: new Date(), createdAt: new Date(), status: work_order_enum_1.WorkOrderStatus.COMPLETED, receiptOriginalName: 'fuel-receipt.jpg' };
(async () => {
    const svc = new work_orders_pdf_service_1.WorkOrdersPdfService();
    (0, fs_1.writeFileSync)(process.argv[2] + '/wo-reimb.pdf', await svc.render({ ...base, type: work_order_enum_1.WorkOrderType.REIMBURSEMENT, title: 'Travel to Lahore client office', category: 'Travel', description: 'Return train tickets and taxi for the annual audit visit at the client office in Lahore.', amount: 62500, expenseDate: '2026-09-20' }));
    (0, fs_1.writeFileSync)(process.argv[2] + '/wo-equip.pdf', await svc.render({ ...base, type: work_order_enum_1.WorkOrderType.EQUIPMENT, ceoRequired: false, title: 'Noise-cancelling headset', category: 'Headset', description: 'For client calls from the open office.', amount: 18000, quantity: 1, neededBy: '2026-10-10', processorReference: 'ASSET-0192', receiptOriginalName: null }));
    console.log('ok');
})();
//# sourceMappingURL=wo-test.js.map