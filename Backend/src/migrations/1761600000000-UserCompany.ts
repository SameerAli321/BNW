import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Team Hierarchy: which company each employee works for — BNW, Hayes, or the HR / Administration
 * team shared across both. Everyone starts in BNW.
 */
export class UserCompany1761600000000 implements MigrationInterface {
  name = 'UserCompany1761600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_company_enum" AS ENUM ('BNW', 'HAYES', 'SHARED')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "company" "public"."users_company_enum" NOT NULL DEFAULT 'BNW'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company"`);
    await queryRunner.query(`DROP TYPE "public"."users_company_enum"`);
  }
}
