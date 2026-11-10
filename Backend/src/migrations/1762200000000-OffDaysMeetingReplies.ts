import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client feedback round (Nov 2026):
 * - Annual Leave: 20 days a year (was 14). Only changed if it's still 14, so a quota HR already
 *   edited in the leave policy isn't overwritten.
 * - Office off days declared by HR / Admin (off_days): no bookings on them, and leave doesn't use a
 *   day for them.
 * - Meeting invites need a reply: booking_participants.response (+ when, + decline reason).
 *   Invitees of meetings that already exist count as accepted; new invites start as PENDING.
 * Written by hand against the entities.
 */
export class OffDaysMeetingReplies1762200000000 implements MigrationInterface {
  name = 'OffDaysMeetingReplies1762200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Annual leave quota ---
    await queryRunner.query(
      `UPDATE "leave_types" SET "annual_quota" = 20 WHERE "name" = 'Annual Leave' AND "annual_quota" = 14`,
    );

    // --- Off days ---
    await queryRunner.query(`
      CREATE TABLE "off_days" (
        "id" SERIAL NOT NULL,
        "date" date NOT NULL,
        "reason" character varying(200) NOT NULL,
        "created_by_id" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_off_days" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_off_days_date" UNIQUE ("date"),
        CONSTRAINT "FK_off_days_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // --- Meeting invite replies ---
    await queryRunner.query(
      `CREATE TYPE "public"."booking_participants_response_enum" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    // Existing invitees count as accepted; the default for new rows is PENDING.
    await queryRunner.query(`
      ALTER TABLE "booking_participants"
        ADD "response" "public"."booking_participants_response_enum" NOT NULL DEFAULT 'ACCEPTED',
        ADD "responded_at" TIMESTAMP WITH TIME ZONE,
        ADD "decline_reason" character varying(300)
    `);
    await queryRunner.query(
      `ALTER TABLE "booking_participants" ALTER COLUMN "response" SET DEFAULT 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_participants"
        DROP COLUMN "decline_reason",
        DROP COLUMN "responded_at",
        DROP COLUMN "response"
    `);
    await queryRunner.query(`DROP TYPE "public"."booking_participants_response_enum"`);
    await queryRunner.query(`DROP TABLE "off_days"`);
    await queryRunner.query(
      `UPDATE "leave_types" SET "annual_quota" = 14 WHERE "name" = 'Annual Leave' AND "annual_quota" = 20`,
    );
  }
}
