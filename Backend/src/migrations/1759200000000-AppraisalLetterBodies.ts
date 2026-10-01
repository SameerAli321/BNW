import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  APPRAISAL_REJECTION_LETTER_BODY,
  APPRAISAL_REJECTION_LETTER_NAME,
  APPRECIATION_LETTER_BODY,
  APPRECIATION_LETTER_NAME,
} from '../letters/appraisal-letter-bodies';

/**
 * Brings already-seeded appraisal-result templates in line with the renderer that now lays out
 * `bodyHtml` and appends the CEO signature: `[Date]` becomes the `{{date}}` token, the
 * "HR Executive" sign-off is dropped (the CEO signs instead), and APPRAISAL_REJECTION gets its
 * final wording in place of the draft. seed.ts is idempotent by type, so it can't do this for
 * existing DBs. Only rows still carrying the original seeded markers are touched — a body an
 * admin has since rewritten is left alone.
 */
export class AppraisalLetterBodies1759200000000 implements MigrationInterface {
  name = 'AppraisalLetterBodies1759200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "letter_templates"
       SET "body_html" = $1, "name" = $2, "version" = "version" + 1, "updated_at" = now()
       WHERE "type" = 'APPRECIATION' AND "body_html" LIKE '%[Date]%'`,
      [APPRECIATION_LETTER_BODY, APPRECIATION_LETTER_NAME],
    );
    await queryRunner.query(
      `UPDATE "letter_templates"
       SET "body_html" = $1, "name" = $2, "version" = "version" + 1, "updated_at" = now()
       WHERE "type" = 'APPRAISAL_REJECTION' AND "body_html" LIKE '%[DRAFT TEMPLATE%'`,
      [APPRAISAL_REJECTION_LETTER_BODY, APPRAISAL_REJECTION_LETTER_NAME],
    );
  }

  public async down(): Promise<void> {
    // Content-only change; the previous draft wording isn't worth restoring.
  }
}
