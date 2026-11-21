import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  TERMS_CHANGE_LETTER_BODY,
  TERMS_CHANGE_LETTER_FIELDS,
  TERMS_CHANGE_LETTER_NAME,
} from '../letters/hr-letter-bodies';

/**
 * Gives the hidden "Change of Contract Terms (placeholder)" template the company's "Changes to
 * Terms of Employment" wording (salary revision after an appraisal) and switches it on so HR can
 * issue it. Same rule as HrLetterBodies: only a row still carrying the placeholder marker is
 * touched — a body an admin has since rewritten is left alone.
 */
export class TermsChangeLetter1762500000000 implements MigrationInterface {
  name = 'TermsChangeLetter1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "letter_templates"
       SET "name" = $1, "body_html" = $2, "fields_schema" = $3::jsonb, "is_active" = true,
           "version" = "version" + 1, "updated_at" = now()
       WHERE "type" = 'TERMS_CHANGE' AND "body_html" LIKE '%[PLACEHOLDER TEMPLATE%'`,
      [
        TERMS_CHANGE_LETTER_NAME,
        TERMS_CHANGE_LETTER_BODY,
        JSON.stringify(TERMS_CHANGE_LETTER_FIELDS),
      ],
    );
  }

  public async down(): Promise<void> {
    // Content-only change; the placeholder wording isn't worth restoring.
  }
}
