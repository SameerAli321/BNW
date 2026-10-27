import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client CEO feedback round (Oct 2026):
 * - Engineering department removed (only when nobody and no announcement still uses it).
 * - Leave types: only Annual and Unpaid — Casual / Sick switched off (old requests are kept).
 * - Announcements can go to several departments (announcement_departments replaces department_id).
 * - Onboarding form: alternate phone number and the employee's date of joining.
 * - Bookings: "Others" type (no room — the person is busy) and repeating bookings (series_id).
 * - Reimbursements: the payroll month an approved claim was added to.
 * - Users: a short "About me" for the Team Hierarchy side panel.
 * Written by hand against the entities.
 */
export class CeoFeedback1762000000000 implements MigrationInterface {
  name = 'CeoFeedback1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Leave types ---
    await queryRunner.query(
      `UPDATE "leave_types" SET "is_active" = false WHERE "name" IN ('Casual Leave', 'Sick Leave')`,
    );

    // --- Announcements → many departments ---
    await queryRunner.query(`
      CREATE TABLE "announcement_departments" (
        "announcement_id" integer NOT NULL,
        "department_id" integer NOT NULL,
        CONSTRAINT "PK_announcement_departments" PRIMARY KEY ("announcement_id", "department_id"),
        CONSTRAINT "FK_announcement_departments_announcement" FOREIGN KEY ("announcement_id")
          REFERENCES "announcements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_announcement_departments_department" FOREIGN KEY ("department_id")
          REFERENCES "departments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_announcement_departments_department" ON "announcement_departments" ("department_id")`,
    );
    await queryRunner.query(`
      INSERT INTO "announcement_departments" ("announcement_id", "department_id")
      SELECT "id", "department_id" FROM "announcements" WHERE "department_id" IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_announcements_department_id"`,
    );
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN "department_id"`);

    // --- Engineering department (after announcements moved, so their links are checked too) ---
    await queryRunner.query(`
      DELETE FROM "departments" d
      WHERE d."name" = 'Engineering'
        AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."department_id" = d."id")
        AND NOT EXISTS (
          SELECT 1 FROM "announcement_departments" ad WHERE ad."department_id" = d."id")
    `);

    // --- Onboarding form ---
    await queryRunner.query(`
      ALTER TABLE "onboarding_forms"
        ADD "alternate_phone" character varying(30),
        ADD "date_of_joining" date
    `);

    // --- Bookings ---
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_type_enum" ADD VALUE IF NOT EXISTS 'OTHER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "CHK_bookings_resource_required"`,
    );
    // Compared as text: a value added to an enum can't be used as a literal in the same transaction.
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "CHK_bookings_resource_required" CHECK (
        "type"::text IN ('MEETING', 'OTHER') OR "resource_id" IS NOT NULL
      )
    `);
    await queryRunner.query(`ALTER TABLE "bookings" ADD "series_id" uuid`);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_series_id" ON "bookings" ("series_id")`);

    // --- Work orders ---
    await queryRunner.query(`ALTER TABLE "work_orders" ADD "payroll_month" character varying(7)`);

    // --- Users ---
    await queryRunner.query(`ALTER TABLE "users" ADD "about_me" character varying(400)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "about_me"`);
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "payroll_month"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_series_id"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "series_id"`);
    // "Others" bookings have no room, so they can't satisfy the old rule — remove them first.
    // (Postgres can't drop a value from an enum; 'OTHER' stays in the type, unused.)
    await queryRunner.query(`DELETE FROM "bookings" WHERE "type"::text = 'OTHER'`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "CHK_bookings_resource_required"`,
    );
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "CHK_bookings_resource_required" CHECK (
        "type" = 'MEETING' OR "resource_id" IS NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "onboarding_forms" DROP COLUMN "date_of_joining", DROP COLUMN "alternate_phone"
    `);

    await queryRunner.query(
      `INSERT INTO "departments" ("name") VALUES ('Engineering') ON CONFLICT ("name") DO NOTHING`,
    );

    await queryRunner.query(`ALTER TABLE "announcements" ADD "department_id" integer`);
    // A post for several departments keeps just one of them.
    await queryRunner.query(`
      UPDATE "announcements" a SET "department_id" = (
        SELECT MIN(ad."department_id") FROM "announcement_departments" ad
        WHERE ad."announcement_id" = a."id")
    `);
    await queryRunner.query(`
      ALTER TABLE "announcements" ADD CONSTRAINT "FK_announcements_department_id"
        FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`DROP TABLE "announcement_departments"`);

    await queryRunner.query(
      `UPDATE "leave_types" SET "is_active" = true WHERE "name" IN ('Casual Leave', 'Sick Leave')`,
    );
  }
}
