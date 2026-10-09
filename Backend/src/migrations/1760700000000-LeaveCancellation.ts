import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Approved-leave cancellation: the employee asks to cancel approved leave that hasn't started,
 * HR / Admin approve (→ CANCELLED) or reject (→ back to APPROVED). New status value plus the
 * cancellation history columns; the original request and its decisions are never overwritten.
 */
export class LeaveCancellation1760700000000 implements MigrationInterface {
  name = 'LeaveCancellation1760700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."leave_requests_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED' AFTER 'APPROVED'`,
    );
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        ADD COLUMN "cancellation_reason" text,
        ADD COLUMN "cancellation_requested_at" TIMESTAMP,
        ADD COLUMN "cancellation_approved" boolean,
        ADD COLUMN "cancellation_remarks" text,
        ADD COLUMN "cancellation_decided_by_id" integer,
        ADD COLUMN "cancellation_decided_at" TIMESTAMP,
        ADD CONSTRAINT "FK_leave_requests_cancellation_decided_by" FOREIGN KEY ("cancellation_decided_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "leave_requests" SET "status" = 'APPROVED' WHERE "status" = 'CANCELLATION_REQUESTED'`,
    );
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        DROP CONSTRAINT "FK_leave_requests_cancellation_decided_by",
        DROP COLUMN "cancellation_decided_at",
        DROP COLUMN "cancellation_decided_by_id",
        DROP COLUMN "cancellation_remarks",
        DROP COLUMN "cancellation_approved",
        DROP COLUMN "cancellation_requested_at",
        DROP COLUMN "cancellation_reason"
    `);
    // Postgres can't drop one enum value — rebuild the type without it.
    await queryRunner.query(`ALTER TABLE "leave_requests" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."leave_requests_status_enum" RENAME TO "leave_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_requests_status_enum" AS ENUM ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ALTER COLUMN "status" TYPE "public"."leave_requests_status_enum" USING "status"::text::"public"."leave_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_MANAGER'`,
    );
  }
}
