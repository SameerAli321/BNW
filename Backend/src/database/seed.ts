import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../config/typeorm.config';
import { Role } from '../entities/role.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { DocumentType } from '../entities/document-type.entity';
import { LetterTemplate, LetterFieldSchemaEntry } from '../entities/letter-template.entity';
import { JoiningPackItem } from '../entities/joining-pack-item.entity';
import { RoleName, ALL_ROLES } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { LetterTemplateType } from '../common/enums/letter-template-type.enum';
import { JoiningPackItemKind } from '../common/enums/joining-pack-item-kind.enum';
import { generateTempPassword } from '../common/utils/temp-password';

const DEPARTMENTS = ['Operations', 'HR', 'Finance', 'Engineering'];

// Starter document types, per docs/API_CONTRACT_SPRINT2.md "New tables".
const DOCUMENT_TYPES = [
  'CV',
  'Photo ID',
  'ID Card',
  'Experience Certificate',
  'Degree Certificate',
  'Signed Offer Letter',
  'Signed Contract',
  'Appraisal Record',
  'Other',
];

// Placeholder letter templates (Sprint 3), per docs/API_CONTRACT_SPRINT3.md scope cut #1 — dummy
// content per explicit project-owner instruction, real bodyHtml comes later.
const LETTER_TEMPLATES: Array<{
  type: LetterTemplateType;
  name: string;
  roleScope: string | null;
  bodyHtml: string;
  fieldsSchema: LetterFieldSchemaEntry[];
}> = [
  {
    type: LetterTemplateType.OFFER,
    name: 'Offer Letter (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real offer letter content]</em></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>We are pleased to offer you the position of {{employee.designation}} at a monthly salary ' +
      'of {{salary}}, starting {{startDate}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'employee.designation', label: 'Designation', autoFilled: true },
      { key: 'salary', label: 'Monthly salary', autoFilled: false },
      { key: 'startDate', label: 'Start date', autoFilled: false },
    ],
  },
  {
    type: LetterTemplateType.EXPERIENCE,
    name: 'Experience Letter (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real experience letter content]</em></p>' +
      '<p>This is to certify that {{employee.fullName}} worked as {{employee.designation}} ' +
      'from {{startDate}} to {{endDate}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'employee.designation', label: 'Designation', autoFilled: true },
      { key: 'startDate', label: 'Start date', autoFilled: false },
      { key: 'endDate', label: 'End date', autoFilled: false },
    ],
  },
  // Gap-fix (docs/API_CONTRACT_GAPS_FIX.md, Gap 4) — 4 more placeholder templates so all 6 guide
  // letter types share the one generic engine. Same idempotent-by-`type` pattern, same "clearly
  // marked placeholder" body text convention as OFFER/EXPERIENCE above.
  {
    type: LetterTemplateType.CONTRACT,
    name: 'Employment Contract (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real employment contract content]</em></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>This confirms your employment as {{employee.designation}} at a monthly salary of ' +
      '{{salary}}, effective from {{startDate}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'employee.designation', label: 'Designation', autoFilled: true },
      { key: 'salary', label: 'Monthly salary', autoFilled: false },
      { key: 'startDate', label: 'Start date', autoFilled: false },
    ],
  },
  {
    type: LetterTemplateType.REDUNDANCY,
    name: 'Redundancy Letter (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real redundancy letter content]</em></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>Your last working day will be {{lastWorkingDay}}. Reason: {{reason}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'lastWorkingDay', label: 'Last working day', autoFilled: false },
      { key: 'reason', label: 'Reason', autoFilled: false },
    ],
  },
  {
    type: LetterTemplateType.TERMS_CHANGE,
    name: 'Change of Contract Terms (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real change-of-terms content]</em></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>Effective {{effectiveDate}}, the following change(s) apply to your contract: ' +
      '{{changeSummary}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'effectiveDate', label: 'Effective date', autoFilled: false },
      { key: 'changeSummary', label: 'Change summary', autoFilled: false },
    ],
  },
  {
    type: LetterTemplateType.WARNING,
    name: 'Warning Letter (placeholder)',
    roleScope: null,
    bodyHtml:
      '<p><em>[PLACEHOLDER TEMPLATE — replace with real warning letter content]</em></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>This letter serves as a formal warning regarding: {{warningReason}}. Issued on ' +
      '{{issuedDate}}.</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'warningReason', label: 'Warning reason', autoFilled: false },
      { key: 'issuedDate', label: 'Issued date', autoFilled: false },
    ],
  },
  // Appraisal-result letters — sent by HR once an appraisal reaches a final CEO decision, per
  // docs/API_CONTRACT_SPRINT4.md addendum. APPRECIATION's body is the OWNER-PROVIDED real content
  // (not a placeholder) — verbatim from the "Appraisal Letter.pdf" they supplied. APPRAISAL_REJECTION
  // is a drafted variant (no equivalent was provided) — flagged for HR/the owner to review/edit.
  {
    type: LetterTemplateType.APPRECIATION,
    name: 'Appreciation for Outstanding Performance',
    roleScope: null,
    bodyHtml:
      '<p style="text-align:right">[Date]</p>' +
      '<p><strong>Appreciation for Outstanding Performance</strong></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>I am pleased to write this letter to express our heartfelt appreciation for your ' +
      'exceptional performance and dedication during challenging times. Your ability to excel ' +
      'under pressure has been truly remarkable and has made a significant impact on our team ' +
      'and organization.</p>' +
      '<p>Throughout {{context}}, you consistently demonstrated resilience, resourcefulness, and ' +
      'a calm demeanor, which were instrumental in achieving our goals. Your positive attitude ' +
      'and proactive approach were inspiring to your colleagues and contributed immensely to our ' +
      'collective success.</p>' +
      '<p>Your capacity to handle high-pressure situations with professionalism and efficiency ' +
      'reflects not only your skills and experience but also your commitment to excellence. Your ' +
      'contributions have not gone unnoticed, and we are grateful for your unwavering dedication ' +
      'to delivering results, even under demanding circumstances.</p>' +
      '<p>We value your exceptional work ethic and the positive example you set for others in ' +
      'the team. Your ability to maintain focus and productivity during challenging times is a ' +
      "testament to your strong work ethic and dedication to our organization's success.</p>" +
      '<p>In recognition of your outstanding contributions, we are pleased to award you an ' +
      'appraisal amount of <strong>{{amount}}</strong>.</p>' +
      '<p>Please accept our sincere gratitude for your outstanding performance. We look forward ' +
      'to your continued contributions and success at BNW Consultants. Thank you once again for ' +
      'your hard work and dedication.</p>' +
      '<p>Warm regards,<br/>HR Executive<br/>BNW Consultants</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      {
        key: 'context',
        label: 'Specific project, period, or situation',
        autoFilled: false,
      },
      { key: 'amount', label: 'Appraisal amount', autoFilled: false },
    ],
  },
  {
    type: LetterTemplateType.APPRAISAL_REJECTION,
    name: 'Appraisal Review Outcome (draft — please review wording)',
    roleScope: null,
    bodyHtml:
      '<p><em>[DRAFT TEMPLATE — no owner-provided wording for this one yet; ' +
      'please review/edit before relying on it]</em></p>' +
      '<p style="text-align:right">[Date]</p>' +
      '<p><strong>Appraisal Review Outcome</strong></p>' +
      '<p>Dear {{employee.fullName}},</p>' +
      '<p>Thank you for submitting your appraisal request and for your continued contributions ' +
      'to BNW Consultants. After careful review by your manager and the CEO, we are not able to ' +
      'approve your appraisal at this time.</p>' +
      '<p>{{feedback}}</p>' +
      '<p>We encourage you to keep working towards your goals, and your manager will be ' +
      'available to discuss this feedback in more detail and support your development going ' +
      'forward.</p>' +
      '<p>We appreciate your effort and look forward to your continued growth with the team.</p>' +
      '<p>Warm regards,<br/>HR Executive<br/>BNW Consultants</p>',
    fieldsSchema: [
      { key: 'employee.fullName', label: 'Employee name', autoFilled: true },
      { key: 'feedback', label: 'Feedback / reason', autoFilled: false },
    ],
  },
];

// Starter joining pack items (Sprint 5), per docs/API_CONTRACT_SPRINT5.md's "New tables" section.
const JOINING_PACK_ITEMS: Array<{
  title: string;
  description: string | null;
  kind: JoiningPackItemKind;
}> = [
  {
    title: 'Operating Guide',
    description: 'How things work day-to-day at BNW — tools, expectations, and workflows.',
    kind: JoiningPackItemKind.OPERATING_GUIDE,
  },
  {
    title: 'Team Introduction',
    description: 'Meet the team you will be working with and who to reach out to for what.',
    kind: JoiningPackItemKind.TEAM_INTRO,
  },
  {
    title: 'Policy Notes',
    description: 'Key HR policies every new joiner should read and acknowledge.',
    kind: JoiningPackItemKind.POLICY_NOTE,
  },
];

// Seed users: email prefix matches role name, per API_CONTRACT_SPRINT1.md "Seed data".
const SEED_USERS: Array<{ email: string; role: RoleName; firstName: string; lastName: string }> = [
  { email: 'admin@bnw.local', role: RoleName.ADMIN, firstName: 'System', lastName: 'Admin' },
  { email: 'hr@bnw.local', role: RoleName.HR, firstName: 'HR', lastName: 'User' },
  { email: 'manager@bnw.local', role: RoleName.MANAGER, firstName: 'Manager', lastName: 'User' },
  { email: 'employee@bnw.local', role: RoleName.EMPLOYEE, firstName: 'Employee', lastName: 'User' },
  { email: 'ceo@bnw.local', role: RoleName.CEO, firstName: 'CEO', lastName: 'User' },
  { email: 'payroll@bnw.local', role: RoleName.PAYROLL, firstName: 'Payroll', lastName: 'User' },
];

async function seed() {
  await dataSource.initialize();

  const roleRepo = dataSource.getRepository(Role);
  const deptRepo = dataSource.getRepository(Department);
  const userRepo = dataSource.getRepository(User);
  const documentTypeRepo = dataSource.getRepository(DocumentType);
  const letterTemplateRepo = dataSource.getRepository(LetterTemplate);
  const joiningPackItemRepo = dataSource.getRepository(JoiningPackItem);

  // Roles
  for (const name of ALL_ROLES) {
    const existing = await roleRepo.findOne({ where: { name } });
    if (!existing) {
      await roleRepo.save(roleRepo.create({ name }));
      console.log(`[seed] role created: ${name}`);
    }
  }

  // Departments
  const departmentsByName = new Map<string, Department>();
  for (const name of DEPARTMENTS) {
    let dept = await deptRepo.findOne({ where: { name } });
    if (!dept) {
      dept = await deptRepo.save(deptRepo.create({ name }));
      console.log(`[seed] department created: ${name}`);
    }
    departmentsByName.set(name, dept);
  }

  // Document types (Sprint 2 — E-record)
  for (const name of DOCUMENT_TYPES) {
    const existing = await documentTypeRepo.findOne({ where: { name } });
    if (!existing) {
      await documentTypeRepo.save(documentTypeRepo.create({ name }));
      console.log(`[seed] document type created: ${name}`);
    }
  }

  // Letter templates (Sprint 3)
  for (const spec of LETTER_TEMPLATES) {
    const existing = await letterTemplateRepo.findOne({ where: { type: spec.type } });
    if (!existing) {
      await letterTemplateRepo.save(
        letterTemplateRepo.create({
          type: spec.type,
          name: spec.name,
          roleScope: spec.roleScope,
          bodyHtml: spec.bodyHtml,
          fieldsSchema: spec.fieldsSchema,
          version: 1,
          isActive: true,
        }),
      );
      console.log(`[seed] letter template created: ${spec.name}`);
    }
  }

  // Joining pack items (Sprint 5)
  for (const spec of JOINING_PACK_ITEMS) {
    const existing = await joiningPackItemRepo.findOne({ where: { title: spec.title } });
    if (!existing) {
      await joiningPackItemRepo.save(
        joiningPackItemRepo.create({
          title: spec.title,
          description: spec.description,
          kind: spec.kind,
          isActive: true,
        }),
      );
      console.log(`[seed] joining pack item created: ${spec.title}`);
    }
  }

  const credentials: Array<{ email: string; password: string }> = [];

  // Users
  for (const spec of SEED_USERS) {
    let user = await userRepo.findOne({ where: { email: spec.email } });
    if (user) {
      console.log(`[seed] user already exists, skipping: ${spec.email}`);
      continue;
    }

    const tempPassword = generateTempPassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    user = userRepo.create({
      firstName: spec.firstName,
      lastName: spec.lastName,
      email: spec.email,
      role: spec.role,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      password_hash,
      departmentId: departmentsByName.get('Operations')?.id ?? null,
    });
    await userRepo.save(user);
    credentials.push({ email: spec.email, password: tempPassword });
    console.log(`[seed] user created: ${spec.email} (${spec.role})`);
  }

  // Wire employee@bnw.local -> managerId = manager@bnw.local, per the contract's seed data note.
  const manager = await userRepo.findOne({ where: { email: 'manager@bnw.local' } });
  const employee = await userRepo.findOne({ where: { email: 'employee@bnw.local' } });
  if (manager && employee && employee.managerId !== manager.id) {
    employee.managerId = manager.id;
    await userRepo.save(employee);
    console.log('[seed] linked employee@bnw.local -> manager@bnw.local');
  }

  await dataSource.destroy();

  if (credentials.length > 0) {
    console.log('\n=== Seeded temporary passwords (dev only — never commit these) ===');
    for (const c of credentials) {
      console.log(`  ${c.email.padEnd(20)} ${c.password}`);
    }
    console.log('All seeded users have mustChangePassword = true.\n');
  } else {
    console.log('\n[seed] No new users created (all seed users already existed).\n');
  }
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
