import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client feedback — "Employee Information" headings: leaving date and the salary block (current /
 * previous salary, deduction policy, last salary change date) on users. Contact number and CNIC
 * already live on employee_profiles (phone / national_id). Salary columns are only ever returned
 * to HR / ADMIN (see toUserDto's includeCompensation).
 */
export class EmployeeInformation1760400000000 implements MigrationInterface {
  name = 'EmployeeInformation1760400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "leaving_date" date,
        ADD COLUMN "current_salary" numeric(12,2),
        ADD COLUMN "previous_salary" numeric(12,2),
        ADD COLUMN "deduction_policy" text,
        ADD COLUMN "last_salary_change_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "last_salary_change_date",
        DROP COLUMN "deduction_policy",
        DROP COLUMN "previous_salary",
        DROP COLUMN "current_salary",
        DROP COLUMN "leaving_date"
    `);
  }
}
