"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const interview_emails_1 = require("./src/interviews/interview-emails");
const ics_1 = require("./src/mail/ics");
const interview_enum_1 = require("./src/common/enums/interview.enum");
const at = (0, interview_emails_1.pktToDate)('2026-10-06', '10:30');
console.log('UTC', at.toISOString(), 'back', (0, interview_emails_1.dateToPkt)(at), (0, interview_emails_1.formatInterviewTime)(at));
const data = { candidateName: 'Ayesha Khan', candidateEmail: 'ayesha@example.com', candidatePhone: '0300 1234567', scheduledAt: at, durationMinutes: 45, mode: interview_enum_1.InterviewMode.ONLINE, meetingLink: 'https://meet.google.com/abc-defg-hij', location: null, message: 'Please prepare a short introduction.\nBring questions!', interviewerNames: ['Sara Ahmed', 'Ali Raza'], senderName: 'HR User' };
const e = (0, interview_emails_1.renderCandidateEmail)('INVITE', data);
console.log(e.subject);
console.log(e.text);
(0, fs_1.writeFileSync)(process.argv[2] + '/invite.html', e.html.replace('cid:bnw-logo', 'file:///C:/Users/99TECH/Desktop/BNW/Backend/assets/email/bnw-logo.png'));
console.log((0, interview_emails_1.renderInterviewerEmail)('CANCEL', data, 'Position filled').subject);
console.log((0, ics_1.buildIcs)({ uid: 'interview-1@bnw-oms', sequence: 0, method: 'REQUEST', start: at, end: new Date(at.getTime() + 45 * 60000), summary: 'Interview — BNW', description: e.text, location: data.meetingLink, url: data.meetingLink, organizer: { name: 'BNW Chartered Accountants', email: 'hr@example.com' }, attendees: [{ name: 'Ayesha Khan', email: 'ayesha@example.com' }] }).split('\r\n').slice(0, 14).join('\n'));
//# sourceMappingURL=dash-mail-test.js.map