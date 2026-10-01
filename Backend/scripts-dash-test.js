"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = __importDefault(require("./src/config/typeorm.config"));
const dashboard_service_1 = require("./src/dashboard/dashboard.service");
(async () => {
    await typeorm_config_1.default.initialize();
    const pending = await typeorm_config_1.default.query(`SELECT name FROM migrations ORDER BY id DESC LIMIT 3`);
    console.log('latest migrations:', pending.map((m) => m.name));
    const users = await typeorm_config_1.default.query(`SELECT id, role FROM users WHERE deleted_at IS NULL ORDER BY id`);
    const svc = new dashboard_service_1.DashboardService(typeorm_config_1.default);
    const admin = users.find((u) => u.role === 'ADMIN');
    const emp = users.find((u) => u.role === 'EMPLOYEE');
    const out = await svc.summary({ sub: admin.id, role: 'ADMIN', email: 'x' });
    console.log(JSON.stringify(out.company, null, 0).slice(0, 1500));
    console.log(JSON.stringify(out.personal).slice(0, 800));
    const e = await svc.summary({ sub: emp.id, role: 'EMPLOYEE', email: 'x' });
    console.log('employee company null:', e.company === null, 'team:', JSON.stringify(e.team));
    await typeorm_config_1.default.destroy();
})().catch((err) => { console.error('ERR', err.message); process.exit(1); });
//# sourceMappingURL=scripts-dash-test.js.map