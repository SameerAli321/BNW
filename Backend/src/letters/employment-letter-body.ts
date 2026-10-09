import { LetterFieldSchemaEntry } from '../entities/letter-template.entity';

/**
 * Employment confirmation letter for interns / trainees ("To Whom It May Concern"), owner-provided
 * wording. Shared by seed.ts (fresh DBs) and the EmploymentLetter migration (existing DBs).
 * Name, designation, join date and CNIC come from the employee's record; "Son/Daughter" and
 * he/she/his/her come from the gender on their E-record profile (falling back to "he/she" etc.
 * when it isn't set). The renderer appends the CEO signature block after "Yours sincerely,".
 */

export const EMPLOYMENT_LETTER_NAME = 'Employment Letter (Intern / Trainee)';

export const EMPLOYMENT_LETTER_BODY =
  '<p>Date: {{date}}<br/>Our Ref: {{reference}}</p>' +
  '<p>To Whom It May Concern</p>' +
  '<p><strong>Re: {{employee.fullName}}, {{employee.relation}} of {{fatherName}}, CNIC Number: ' +
  '{{employee.cnic}}</strong></p>' +
  '<p>This letter is to confirm that {{employee.fullName}} is currently employed at BNW ' +
  'CONSULTANTS (SMC-PRIVATE) LIMITED as a {{employee.designation}}.</p>' +
  '<p>{{employee.firstName}} joined our team on {{employee.joinDate}} and is currently undergoing ' +
  'a structured training program as part of {{employee.his}} role. The training period is ' +
  'scheduled for {{trainingPeriod}}, during which {{employee.he}} will gain practical experience ' +
  'and skills relevant to the accounting field.</p>' +
  "<p>We are pleased with {{employee.firstName}}'s performance and dedication thus far. " +
  '{{employee.He}} has shown a strong willingness to learn and contribute effectively to our ' +
  'team. We believe that this training opportunity will provide {{employee.him}} with valuable ' +
  'insights and enhance {{employee.his}} professional development in the accounting domain.</p>' +
  '<p>Should you require further details, please feel free to contact us at ' +
  'hr@bnwaccountants.co.uk</p>' +
  '<p>Yours sincerely,</p>';

export const EMPLOYMENT_LETTER_FIELDS: LetterFieldSchemaEntry[] = [
  { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
  { key: 'employee.designation', label: 'Designation (e.g. Trainee Accountant)', autoFilled: true },
  { key: 'employee.joinDate', label: 'Join date', autoFilled: true },
  { key: 'employee.cnic', label: 'CNIC (from E-record)', autoFilled: true },
  { key: 'fatherName', label: "Father's name", autoFilled: false },
  { key: 'reference', label: 'Our Ref (e.g. AYU/1121)', autoFilled: false },
  { key: 'trainingPeriod', label: 'Training period (e.g. three months)', autoFilled: false },
];
