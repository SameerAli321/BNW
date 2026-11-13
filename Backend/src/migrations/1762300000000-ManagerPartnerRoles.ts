import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two more roles that lead people (client checklist, Nov 2026): Manager (stored as LINE_MANAGER —
 * MANAGER is already "Team Lead") and Partner. Like Team Leads they only see themselves and the
 * people reporting to them (see TEAM_LEAD_ROLES).
 *
 * Nothing here uses the new values, so no commit is needed after `ADD VALUE` (cf.
 * 1759400000000-EmploymentLetter). Idempotent, so a re-run is safe.
 */
export class ManagerPartnerRoles1762300000000 implements MigrationInterface {
  name = 'ManagerPartnerRoles1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'LINE_MANAGER';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'PARTNER';`,
    );
    // The static role list (also served by GET /roles from ALL_ROLES).
    await queryRunner.query(
      `INSERT INTO "roles" ("name") VALUES ('LINE_MANAGER'), ('PARTNER') ON CONFLICT ("name") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres can't drop an enum value; anyone on the new roles goes back to Team Lead.
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'MANAGER' WHERE "role"::text IN ('LINE_MANAGER', 'PARTNER')`,
    );
    await queryRunner.query(`DELETE FROM "roles" WHERE "name" IN ('LINE_MANAGER', 'PARTNER')`);
  }
}
