import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  EMPLOYMENT_LETTER_BODY,
  EMPLOYMENT_LETTER_FIELDS,
  EMPLOYMENT_LETTER_NAME,
} from '../letters/employment-letter-body';

/**
 * Adds the EMPLOYMENT_CONFIRMATION letter type (intern / trainee employment letter) and its
 * template, and hides the six original placeholder templates (Offer, Contract, Redundancy, Terms
 * Change, Warning, Experience) per the project owner — they stay in the DB and can be re-activated
 * from Letter Templates.
 *
 * Postgres can't use a new enum value until the transaction that added it commits, and TypeORM
 * runs every pending migration in one shared transaction (no per-migration opt-out in "all"
 * mode). So this commits right after `ADD VALUE` and continues in a fresh transaction. Every
 * step is idempotent (`IF NOT EXISTS`, insert-if-missing), so a re-run after a failure part-way
 * through is safe.
 */
export class EmploymentLetter1759400000000 implements MigrationInterface {
  name = 'EmploymentLetter1759400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."letter_templates_type_enum" ADD VALUE IF NOT EXISTS 'EMPLOYMENT_CONFIRMATION';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."letters_type_enum" ADD VALUE IF NOT EXISTS 'EMPLOYMENT_CONFIRMATION';`,
    );
    if (queryRunner.isTransactionActive) {
      await queryRunner.commitTransaction();
      await queryRunner.startTransaction();
    }

    await queryRunner.query(
      `INSERT INTO "letter_templates" ("type", "name", "role_scope", "body_html", "fields_schema", "version", "is_active")
       SELECT 'EMPLOYMENT_CONFIRMATION', $1, NULL, $2, $3::jsonb, 1, true
       WHERE NOT EXISTS (SELECT 1 FROM "letter_templates" WHERE "type" = 'EMPLOYMENT_CONFIRMATION')`,
      [EMPLOYMENT_LETTER_NAME, EMPLOYMENT_LETTER_BODY, JSON.stringify(EMPLOYMENT_LETTER_FIELDS)],
    );

    await queryRunner.query(
      `UPDATE "letter_templates" SET "is_active" = false, "updated_at" = now()
       WHERE "type" IN ('OFFER', 'CONTRACT', 'REDUNDANCY', 'TERMS_CHANGE', 'WARNING', 'EXPERIENCE')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-show the placeholder templates. The enum value itself can't be dropped (see
    // 1758980000000-AppraisalResultLetterTypes); the template row is left for letters that use it.
    await queryRunner.query(
      `UPDATE "letter_templates" SET "is_active" = true, "updated_at" = now()
       WHERE "type" IN ('OFFER', 'CONTRACT', 'REDUNDANCY', 'TERMS_CHANGE', 'WARNING', 'EXPERIENCE')`,
    );
  }
}
