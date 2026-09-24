import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gap-fix (docs/API_CONTRACT_GAPS_FIX.md): employee_profiles, audit_logs, notifications — 3
 * tables the original client requirements guide put in scope for Sprint 0/1/3 that the team's
 * own narrower per-sprint contract docs silently dropped. See docs/BACKEND_STATUS.md's "Gap-fix"
 * section. Column names are snake_case (SnakeNamingStrategy); entity properties and API JSON stay
 * camelCase. Written by hand against src/entities/employee-profile.entity.ts,
 * audit-log.entity.ts, notification.entity.ts — same approach as the Sprint 1/2/3 migrations.
 * Separate file — none of the existing migrations are touched.
 */
export class GapFixProfilesAuditLogsNotifications1758810000000 implements MigrationInterface {
  name = 'GapFixProfilesAuditLogsNotifications1758810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- employee_profiles (Gap 1) --------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "public"."employee_profiles_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
    `);

    await queryRunner.query(`
      CREATE TABLE "employee_profiles" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "phone" varchar(30),
        "address" text,
        "date_of_birth" date,
        "gender" "public"."employee_profiles_gender_enum",
        "emergency_contact_name" varchar(150),
        "emergency_contact_phone" varchar(30),
        "national_id" varchar(60),
        "bank_name" varchar(150),
        "bank_account_number" varchar(60),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_employee_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_employee_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // --- audit_logs (Gap 2) -------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "actor_id" integer,
        "action" varchar(60) NOT NULL,
        "entity" varchar(60) NOT NULL,
        "entity_id" integer,
        "before" jsonb,
        "after" jsonb,
        "ip_address" varchar(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_audit_logs_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity");`);

    // --- notifications (Gap 3) ----------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "type" varchar(60) NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text,
        "link" varchar(500),
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_id";`);
    await queryRunner.query(`DROP TABLE "notifications";`);

    await queryRunner.query(`DROP INDEX "IDX_audit_logs_entity";`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_actor_id";`);
    await queryRunner.query(`DROP TABLE "audit_logs";`);

    await queryRunner.query(`DROP TABLE "employee_profiles";`);
    await queryRunner.query(`DROP TYPE "public"."employee_profiles_gender_enum";`);
  }
}
