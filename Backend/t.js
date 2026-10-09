"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ics_1 = require("./src/mail/ics");
const out = (0, ics_1.buildIcs)({ uid: 'u', sequence: 0, method: 'REQUEST', start: new Date(), end: new Date(), summary: 'Interview — BNW Chartered Accountants — '.repeat(4), description: 'x', organizer: { name: 'B', email: 'a@b.c' }, attendees: [] });
console.log('max octets', Math.max(...out.split('\r\n').map((l) => Buffer.byteLength(l))));
//# sourceMappingURL=t.js.map