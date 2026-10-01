"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = __importDefault(require("./src/config/typeorm.config"));
const work_orders_service_1 = require("./src/work-orders/work-orders.service");
const work_order_entity_1 = require("./src/entities/work-order.entity");
const app_setting_entity_1 = require("./src/entities/app-setting.entity");
const user_entity_1 = require("./src/entities/user.entity");
const notification_entity_1 = require("./src/entities/notification.entity");
const work_order_enum_1 = require("./src/common/enums/work-order.enum");
(async () => {
    await typeorm_config_1.default.initialize();
    const sent = [];
    const mail = { appUrl: (p) => 'http://app' + p, send: async (m) => { sent.push(m.subject); return { status: 'NOT_CONFIGURED' }; } };
    const svc = new work_orders_service_1.WorkOrdersService(typeorm_config_1.default.getRepository(work_order_entity_1.WorkOrder), typeorm_config_1.default.getRepository(app_setting_entity_1.AppSetting), typeorm_config_1.default.getRepository(user_entity_1.User), typeorm_config_1.default.getRepository(notification_entity_1.Notification), mail);
    const users = await typeorm_config_1.default.getRepository(user_entity_1.User).find();
    const emp = users.find((u) => u.managerId && u.role === 'EMPLOYEE');
    const mgr = users.find((u) => u.id === emp.managerId);
    const ceo = users.find((u) => u.role === 'CEO');
    const payroll = users.find((u) => u.role === 'PAYROLL');
    const hr = users.find((u) => u.role === 'HR');
    const as = (u) => ({ sub: u.id, role: u.role, email: u.email });
    const ids = [];
    try {
        console.log('settings', (await svc.getSettings()).ceoApprovalLimit);
        let wo = await svc.create({ type: work_order_enum_1.WorkOrderType.REIMBURSEMENT, title: 'Test travel', category: 'Travel', description: 'x', amount: 60000, expenseDate: '2026-09-20' }, undefined, as(emp));
        ids.push(wo.id);
        console.log('1 created', wo.status, 'ceoRequired', wo.ceoRequired);
        const q = await svc.list({}, { kind: 'queue', caller: as(mgr) });
        console.log('  manager queue has it:', q.data.some((d) => d.id === wo.id));
        try {
            await svc.process(wo.id, { approved: true, signatureText: 'x' }, as(payroll));
        }
        catch (e) {
            console.log('  payroll too early ->', e.message);
        }
        wo = await svc.managerDecision(wo.id, { approved: true, signatureText: 'Mgr' }, as(mgr));
        console.log('  after manager', wo.status);
        wo = await svc.ceoDecision(wo.id, { approved: true, signatureText: 'CEO' }, as(ceo));
        console.log('  after ceo', wo.status);
        try {
            await svc.process(wo.id, { approved: true, signatureText: 'x' }, as(hr));
        }
        catch (e) {
            console.log('  HR on reimbursement ->', e.message);
        }
        wo = await svc.process(wo.id, { approved: true, signatureText: 'Pay', reference: 'TRX1' }, as(payroll));
        console.log('  after payroll', wo.status, wo.processorReference);
        let eq = await svc.create({ type: work_order_enum_1.WorkOrderType.EQUIPMENT, title: 'Test mouse', category: 'Keyboard / mouse', description: 'x', quantity: 2 }, undefined, as(emp));
        ids.push(eq.id);
        console.log('2 created', eq.status, 'ceoRequired', eq.ceoRequired, 'qty', eq.quantity);
        eq = await svc.managerDecision(eq.id, { approved: true, signatureText: 'Mgr' }, as(mgr));
        console.log('  after manager', eq.status);
        eq = await svc.process(eq.id, { approved: false, remarks: 'Use spare', signatureText: 'HR' }, as(hr));
        console.log('  after HR reject', eq.status);
        const c = await svc.create({ type: work_order_enum_1.WorkOrderType.EQUIPMENT, title: 'Test chair', category: 'Furniture', description: 'x' }, undefined, as(emp));
        ids.push(c.id);
        console.log('3 cancel ->', (await svc.cancel(c.id, as(emp))).status);
        try {
            await svc.getOne(wo.id, as(users.find((u) => u.role === 'EMPLOYEE' && u.id !== emp.id && u.id !== mgr.id)));
        }
        catch (e) {
            console.log('  other employee view ->', e.message);
        }
        console.log('emails queued:', sent.length);
    }
    finally {
        if (ids.length) {
            await typeorm_config_1.default.query(`DELETE FROM notifications WHERE type = 'WORK_ORDER' AND link = ANY($1)`, [ids.map((i) => `/dashboard/work-orders/${i}`)]);
            await typeorm_config_1.default.query(`DELETE FROM work_orders WHERE id = ANY($1)`, [ids]);
        }
        await typeorm_config_1.default.destroy();
    }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
//# sourceMappingURL=wo-flow.js.map