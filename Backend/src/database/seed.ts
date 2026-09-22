import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../config/typeorm.config';
import { Role } from '../entities/role.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { RoleName, ALL_ROLES } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { generateTempPassword } from '../common/utils/temp-password';

const DEPARTMENTS = ['Operations', 'HR', 'Finance', 'Engineering'];

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
