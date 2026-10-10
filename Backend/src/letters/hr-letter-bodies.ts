import { LetterFieldSchemaEntry } from '../entities/letter-template.entity';

/**
 * Offer, Experience, Redundancy and Warning letters — owner-provided wording (the company's own
 * signed letters), replacing the Sprint 3 placeholder templates. Shared by seed.ts (fresh DBs) and
 * the HrLetterBodies migration (existing DBs). Name, designation, department, join date and CNIC
 * come from the employee's record; Mr./Ms. and he/she/his/her come from the gender on their
 * E-record profile. The renderer draws the letterhead and appends the signature block after the
 * closing line ("Sincerely," / "Yours sincerely,").
 */

export const OFFER_LETTER_NAME = 'Offer Letter';

export const OFFER_LETTER_BODY =
  '<p>{{date}}</p>' +
  '<p>Dear {{employee.fullName}},</p>' +
  '<p><strong>Re: Offer of Employment - {{employee.designation}}</strong></p>' +
  '<p>I am pleased to extend an offer of employment to you for the position of ' +
  '<strong>{{employee.designation}}</strong> at BNW CONSULTANTS (SMC-PRIVATE) LIMITED. After ' +
  'careful consideration of your qualifications and performance during the interview process, we ' +
  'are confident that your skills and experience align perfectly with our company’s needs.</p>' +
  '<p>Position: <strong>{{employee.designation}}</strong><br/>' +
  'Department: {{employee.department}}<br/>' +
  'Reporting to: {{reportingTo}}<br/>' +
  'Location: 427, Street 5/2, Block D, National Police Foundation, PWD.</p>' +
  '<p><strong>Terms of Employment:</strong></p>' +
  '<p>Probation Period: You will be on probation for a duration of {{probationPeriod}}, during ' +
  'which your performance will be evaluated. You will not be entitled to perks and benefits ' +
  'associated with this role.</p>' +
  '<p>Confirmation: Upon successful completion of the probation period, your employment will be ' +
  'confirmed, and you will be eligible for medical insurance and annual performance bonus.</p>' +
  '<p>Commencement Date: Your employment with BNW CONSULTANTS (SMC-PRIVATE) LIMITED is expected ' +
  'to commence on {{startDate}}. Should you wish to change this joining date, please get in ' +
  'touch.</p>' +
  '<p><strong>Compensation and Benefits:</strong></p>' +
  '<p>Salary: Your gross monthly salary will be {{salary}}. This will be subject to a 10% monthly ' +
  'deduction as per the company policy. This deduction will be paid along with end of term ' +
  'benefits to you at the completion of your employment.</p>' +
  '<p>Other Benefits: Following successful completion of your probation period, you will be ' +
  'eligible for the company’s standard benefits, including medical insurance/reimbursement in ' +
  'line with the company policy, Pakistan public holidays and 20 paid leaves.</p>' +
  '<p>We are confident that your skills and expertise will make a valuable contribution to our ' +
  'team. We look forward to welcoming you to BNW CONSULTANTS (SMC-PRIVATE) LIMITED and are ' +
  'excited about the prospect of working together.</p>' +
  '<p>To accept this offer, please sign and return a copy of this letter by {{acceptBy}}. Should ' +
  'you have any questions or require further clarification, please do not hesitate to contact ' +
  'Qamer Zaman at hr@bnwaccountants.co.uk or +92 331 3304678.</p>' +
  '<p>Upon accepting this letter and providing proof of your resignation’s acceptance, the ' +
  'contract of employment will be provided to you for signing.</p>' +
  '<p>Once again, congratulations on your successful application. We are eager to have you join ' +
  'our team.</p>' +
  '<p>Sincerely,</p>';

export const OFFER_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Candidate name', autoFilled: true },
  { key: 'employee.designation', label: 'Position (designation)', autoFilled: true },
  { key: 'employee.department', label: 'Department', autoFilled: true },
  {
    key: 'reportingTo',
    label: 'Reporting to (e.g. Practice Managers/Manager - Client Reporting)',
    autoFilled: false,
  },
  { key: 'probationPeriod', label: 'Probation period (e.g. two months)', autoFilled: false },
  { key: 'startDate', label: 'Commencement date (e.g. 15th October 2025)', autoFilled: false },
  { key: 'salary', label: 'Gross monthly salary (e.g. PKR 250,000)', autoFilled: false },
  { key: 'acceptBy', label: 'Accept by (e.g. 24th September 2025)', autoFilled: false },
];

export const EXPERIENCE_LETTER_NAME = 'Experience Letter';

export const EXPERIENCE_LETTER_BODY =
  '<p style="text-align: right">{{date}}</p>' +
  '<p style="text-align: center"><strong>To Whom It May Concern,</strong></p>' +
  '<p>This is to certify that <strong>{{employee.title}} {{employee.fullName}}, CNIC ' +
  '{{employee.cnic}}</strong> worked as a <strong>{{employee.designation}}</strong> at BNW ' +
  'Consultants (SMC-PRIVATE) Limited from {{employee.joinDate}} to {{endDate}}. During this ' +
  'period, {{employee.he}} exhibited exceptional professional skills and demonstrated a high ' +
  'level of dedication and commitment to the projects and tasks assigned.</p>' +
  '<p>During {{employee.his}} time working for us, {{employee.title}} {{employee.firstName}} ' +
  'demonstrated ability to work effectively in a team and independently, and for consistently ' +
  'meeting or exceeding the expectations set for {{employee.him}}. {{employee.He}} demonstrated ' +
  'excellent understanding and importance of {{employee.his}} work, which greatly contributed to ' +
  'the success of {{employee.his}} work and the company’s goals.</p>' +
  '<p>We sincerely appreciate <strong>{{employee.title}} {{employee.firstName}}’s</strong> ' +
  'contributions to our company and believe {{employee.he}} will continue to excel in ' +
  '{{employee.his}} professional journey. We wish <strong>{{employee.title}} ' +
  '{{employee.fullName}}</strong> all the best in {{employee.his}} future endeavors.</p>' +
  '<p>Sincerely,</p>';

export const EXPERIENCE_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
  { key: 'employee.designation', label: 'Designation (e.g. Trainee Accountant)', autoFilled: true },
  { key: 'employee.cnic', label: 'CNIC (from E-record)', autoFilled: true },
  { key: 'employee.joinDate', label: 'Start date (join date)', autoFilled: true },
  { key: 'endDate', label: 'End date (e.g. 28th August 2026)', autoFilled: false },
];

export const REDUNDANCY_LETTER_NAME = 'Notice of Redundancy';

export const REDUNDANCY_LETTER_BODY =
  '<p>{{employee.title}} {{employee.fullName}}</p>' +
  '<p><strong>Subject: Notice of Redundancy</strong></p>' +
  '<p>Dear {{employee.title}} {{employee.firstName}},</p>' +
  '<p>I hope this letter finds you well.</p>' +
  '<p>We regret to inform you that your position is being made redundant. {{reason}}</p>' +
  '<p>In accordance with the terms of your employment agreement, this letter serves as your ' +
  'official {{noticePeriod}} notice period, commencing on {{noticeStartDate}} and concluding on ' +
  '{{lastWorkingDay}}.</p>' +
  '<p>We would also like to remind you that your obligations regarding data privacy and ' +
  'confidentiality, as outlined in your signed agreement, remain fully enforceable. It is ' +
  'imperative that all company and client information continues to be treated with the highest ' +
  'level of confidentiality both during and after your employment.</p>' +
  '<p>Furthermore, we kindly request that you return the company-issued laptop and any other ' +
  'equipment in proper working condition no later than your final working day.</p>' +
  '<p>We thank you for your contributions and professionalism during your time with us.</p>' +
  '<p>Yours sincerely,</p>';

export const REDUNDANCY_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
  {
    key: 'reason',
    label:
      'Reason (e.g. As you are aware, your role was directly associated with one of our clients ' +
      'who has recently decided to replace the position as part of a restructuring of their ' +
      'business model.)',
    autoFilled: false,
  },
  { key: 'noticePeriod', label: 'Notice period (e.g. two-month)', autoFilled: false },
  { key: 'noticeStartDate', label: 'Notice starts on (e.g. 24th June 2025)', autoFilled: false },
  { key: 'lastWorkingDay', label: 'Notice ends on (e.g. 23rd August 2025)', autoFilled: false },
];

export const WARNING_LETTER_NAME = 'Warning Letter';

export const WARNING_LETTER_BODY =
  '<p><strong>Date: {{date}}</strong></p>' +
  '<p><strong>{{employee.title}} {{employee.fullName}}</strong><br/>' +
  '{{employee.designation}}<br/>' +
  'BNW Consultants (SMC-PVT) Limited</p>' +
  '<p><strong>Subject: Formal Warning – {{warningSubject}}</strong></p>' +
  '<p>This letter serves as a formal warning regarding {{warningReason}}.</p>' +
  '<p>{{details}}</p>' +
  '<p>{{expectations}}</p>' +
  '<p>Please be advised that failure to demonstrate clear and consistent improvement in the next ' +
  '{{reviewPeriod}} will result in further disciplinary action, which may include termination in ' +
  'accordance with company policy.</p>' +
  '<p>This matter is being taken very seriously. You are expected to treat this warning with the ' +
  'same level of seriousness and correct your performance and behaviour without delay.</p>' +
  '<p>Should you require support or clarification regarding expectations, you are encouraged to ' +
  'discuss this with your line manager directly.</p>' +
  '<p>Sincerely,</p>';

export const WARNING_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
  { key: 'employee.designation', label: 'Designation', autoFilled: true },
  {
    key: 'warningSubject',
    label: 'Subject (e.g. Conduct, Punctuality, and Performance)',
    autoFilled: false,
  },
  {
    key: 'warningReason',
    label: 'Warning regarding (e.g. your conduct, punctuality, and overall performance at work)',
    autoFilled: false,
  },
  {
    key: 'details',
    label: 'Details — what happened (one paragraph)',
    autoFilled: false,
  },
  {
    key: 'expectations',
    label: 'Expected improvement (one paragraph)',
    autoFilled: false,
  },
  { key: 'reviewPeriod', label: 'Review period (e.g. 30 days)', autoFilled: false },
];
