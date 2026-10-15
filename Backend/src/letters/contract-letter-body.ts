import { LetterFieldSchemaEntry } from '../entities/letter-template.entity';

/**
 * Contract of Employment — the owner-provided contract wording (EmploymentContract PDF), replacing
 * the Sprint 3 placeholder. Shared by seed.ts (fresh DBs) and the ContractLetterBody migration
 * (existing DBs). Only the employee's details change from one contract to the next: name, ID, job
 * title, department, reporting manager, joining date and salary come from the employee's record;
 * the rest is filled in by HR. The renderer draws the letterhead, the details table, the bullet
 * list and the two-column signature lines (employee / authorised company representative).
 */

export const CONTRACT_LETTER_NAME = 'Contract of Employment';

/** Deputy Manager duties from the owner's contract — pre-filled, HR edits them per role. */
export const DEFAULT_JOB_DUTIES = [
  'Review work as assigned by the managers.',
  'Preparation of Statutory Accounts & Corporation Tax Returns.',
  'Preparation of Individual Tax Returns.',
  'Tax Planning.',
  'Responding to client queries by email, telephone, or any other applicable communication method.',
  'Other tasks and responsibilities that may arise as the practice evolves and adapts to changes in the market, software, and business requirements.',
  'Preparation of VAT returns.',
  'Training and mentoring of junior staff members.',
  "Carry out any other reasonable duties required to support the smooth operation of the business. The Employee's job description may be amended from time to time.",
].join('\n');

const detailRow = (label: string, value: string) => `<tr><th>${label}</th><td>${value}</td></tr>`;

export const CONTRACT_LETTER_BODY =
  '<h1>BNW CHARTERED ACCOUNTANTS</h1>' +
  '<h1>CONTRACT OF EMPLOYMENT</h1>' +
  '<h2>EMPLOYEE DETAILS</h2>' +
  '<table>' +
  detailRow('Employee Name', '{{employee.fullName}}') +
  detailRow('Employer Name', 'BNW Chartered Accountants') +
  detailRow('Employee ID', '{{employee.employeeCode}}') +
  detailRow('Job Title', '{{employee.designation}}') +
  detailRow('Department', '{{employee.department}}') +
  detailRow('Reporting Manager', '{{employee.managerName}}') +
  detailRow('Contract Type', '{{contractType}}') +
  detailRow('Joining Date', '{{employee.joinDate}}') +
  detailRow('Gross Salary', '{{employee.salary}}') +
  detailRow('Probation Period', '{{probationPeriod}}') +
  detailRow('Probation End Date', '{{probationEndDate}}') +
  detailRow('Registered Office', '{{registeredOffice}}') +
  detailRow('Head Office', '{{headOffice}}') +
  detailRow('Legal Advisors', '{{legalAdvisors}}') +
  '</table>' +
  '<h2>1. APPOINTMENT</h2>' +
  '<p>The Company hereby appoints <strong>{{employee.fullName}}</strong> as ' +
  '<strong>{{employee.designation}}</strong> in the <strong>{{employee.department}}</strong> ' +
  'Department with effect from <strong>{{employee.joinDate}}</strong>.</p>' +
  '<h2>JOB DESCRIPTION</h2>' +
  '<p>List of Tasks Expected of a {{employee.designation}}:</p>' +
  '<ul><li>{{jobDuties}}</li></ul>' +
  '<p>The Employee will, however, be expected to carry out any other reasonable duties in line ' +
  'with {{employee.his}} responsibilities to assist in the smooth running of the business. From ' +
  'time to time, the job description may be changed.</p>' +
  '<h2>2. REPORTING</h2>' +
  '<p>The Employee shall report directly to <strong>{{employee.managerName}}</strong> or any other ' +
  'person designated by the Company.</p>' +
  '<h2>3. SALARY</h2>' +
  '<p>The Employee shall receive a salary of <strong>{{employee.salary}}</strong>, payable in ' +
  "accordance with the Company's payroll schedule and subject to all statutory deductions.</p>" +
  '<h2>4. PROBATION</h2>' +
  '<p>The Employee shall serve a probation period of <strong>{{probationPeriod}}</strong>, ending ' +
  'on <strong>{{probationEndDate}}</strong>.</p>' +
  '<p>Successful completion of the probation period does not automatically guarantee ' +
  'confirmation of employment. Confirmation shall be communicated by the Company in writing.</p>' +
  '<h2>5. CONTRACT TYPE</h2>' +
  '<p>This appointment is offered as a <strong>{{contractType}}</strong> position.</p>' +
  '<h2>6. DUTIES</h2>' +
  '<p>The Employee agrees to perform all duties assigned by the Company that are consistent with ' +
  "the Employee's position and qualifications.</p>" +
  '<h2>7. WORKING HOURS</h2>' +
  "<p>The Employee shall work the Company's standard working hours and comply with all " +
  'attendance requirements.</p>' +
  '<h2>8. LEAVE</h2>' +
  '<p>The Employee shall be entitled to annual leave, sick leave, public holidays and any other ' +
  'leave in accordance with Company policy and applicable employment laws.</p>' +
  '<h2>ACCEPTANCE</h2>' +
  '<p>By signing below, both parties acknowledge that they have read, understood and agreed to ' +
  'the terms and conditions of this Contract of Employment.</p>';

export const CONTRACT_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
  { key: 'employee.employeeCode', label: 'Employee ID (employee code)', autoFilled: true },
  { key: 'employee.designation', label: 'Job title', autoFilled: true },
  { key: 'employee.department', label: 'Department', autoFilled: true },
  { key: 'employee.managerName', label: 'Reporting manager', autoFilled: true },
  { key: 'employee.joinDate', label: 'Joining date', autoFilled: true },
  { key: 'employee.salary', label: 'Gross salary (current salary)', autoFilled: true },
  {
    key: 'contractType',
    label: 'Contract type (e.g. Full-Time)',
    autoFilled: false,
    defaultValue: 'Full-Time',
  },
  {
    key: 'probationPeriod',
    label: 'Probation period (e.g. 6 months)',
    autoFilled: false,
    defaultValue: '6 months',
  },
  { key: 'probationEndDate', label: 'Probation end date (e.g. 5 August 2026)', autoFilled: false },
  { key: 'registeredOffice', label: 'Registered office', autoFilled: false },
  { key: 'headOffice', label: 'Head office', autoFilled: false },
  { key: 'legalAdvisors', label: 'Legal advisors', autoFilled: false },
  {
    key: 'jobDuties',
    label: 'Job description — one task per line',
    autoFilled: false,
    multiline: true,
    defaultValue: DEFAULT_JOB_DUTIES,
  },
];
