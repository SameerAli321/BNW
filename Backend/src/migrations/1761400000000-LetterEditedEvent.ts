import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Letters stay editable until the employee signs — each later edit is logged on the letter's
 * timeline as an EDITED event.
 */
export class LetterEditedEvent1761400000000 implements MigrationInterface {
  name = 'LetterEditedEvent1761400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."letter_events_action_enum" ADD VALUE IF NOT EXISTS 'EDITED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres can't drop an enum value — rebuild the type without it.
    await queryRunner.query(`DELETE FROM "letter_events" WHERE "action" = 'EDITED'`);
    await queryRunner.query(
      `ALTER TYPE "public"."letter_events_action_enum" RENAME TO "letter_events_action_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."letter_events_action_enum" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'CEO_SIGNED', 'SENT_TO_EMPLOYEE', 'EMPLOYEE_SIGNED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "letter_events" ALTER COLUMN "action" TYPE "public"."letter_events_action_enum" USING "action"::text::"public"."letter_events_action_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."letter_events_action_enum_old"`);
  }
}
