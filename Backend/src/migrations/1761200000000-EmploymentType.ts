import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client feedback — interns: an "Employment type" on every user (Permanent / Contract / Probation /
 * Intern). Existing users become PERMANENT.
 */
export class EmploymentType1761200000000 implements MigrationInterface {
  name = 'EmploymentType1761200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_employment_type_enum" AS ENUM ('PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "employment_type" "public"."users_employment_type_enum" NOT NULL DEFAULT 'PERMANENT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "employment_type"`);
    await queryRunner.query(`DROP TYPE "public"."users_employment_type_enum"`);
  }
}
