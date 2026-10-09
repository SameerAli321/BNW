"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = __importDefault(require("./src/config/typeorm.config"));
(async () => { await typeorm_config_1.default.initialize(); const r = await typeorm_config_1.default.query(`SELECT name FROM migrations ORDER BY id DESC LIMIT 3`); console.log(r.map((x) => x.name)); await typeorm_config_1.default.destroy(); })();
//# sourceMappingURL=m.js.map