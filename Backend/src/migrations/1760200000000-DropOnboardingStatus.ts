import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Users are now either ACTIVE (the default on create) or INACTIVE (shown as "Removed"). The old
 * ONBOARDING account status is gone: existing ONBOARDING users become ACTIVE and the value is
 * dropped from the enum. (The onboarding *form* is unaffected — it never depended on this.)
 */
export class DropOnboardingStatus1760200000000 implements MigrationInterface {
  name = 'DropOnboardingStatus1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`UPDATE "users" SET "status" = 'ACTIVE' WHERE "status" = 'ONBOARDING'`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_status_enum" RENAME TO "users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum" USING "status"::text::"public"."users_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_status_enum" RENAME TO "users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum" USING "status"::text::"public"."users_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ONBOARDING'`);
  }
}
