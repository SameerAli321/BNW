import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  EXPERIENCE_LETTER_BODY,
  EXPERIENCE_LETTER_FIELDS,
  EXPERIENCE_LETTER_NAME,
  OFFER_LETTER_BODY,
  OFFER_LETTER_FIELDS,
  OFFER_LETTER_NAME,
  REDUNDANCY_LETTER_BODY,
  REDUNDANCY_LETTER_FIELDS,
  REDUNDANCY_LETTER_NAME,
  WARNING_LETTER_BODY,
  WARNING_LETTER_FIELDS,
  WARNING_LETTER_NAME,
} from '../letters/hr-letter-bodies';

/**
 * Replaces the Offer / Experience / Redundancy / Warning placeholder templates with the
 * owner-provided wording (letters/hr-letter-bodies.ts) and re-activates them so HR can issue them.
 * seed.ts is idempotent by type, so it can't do this for existing DBs. Only rows still carrying the
 * original "[PLACEHOLDER TEMPLATE" marker are touched — a body an admin has since rewritten is
 * left alone.
 */
export class HrLetterBodies1760800000000 implements MigrationInterface {
  name = 'HrLetterBodies1760800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const templates: Array<[string, string, string, unknown]> = [
      ['OFFER', OFFER_LETTER_NAME, OFFER_LETTER_BODY, OFFER_LETTER_FIELDS],
      ['EXPERIENCE', EXPERIENCE_LETTER_NAME, EXPERIENCE_LETTER_BODY, EXPERIENCE_LETTER_FIELDS],
      ['REDUNDANCY', REDUNDANCY_LETTER_NAME, REDUNDANCY_LETTER_BODY, REDUNDANCY_LETTER_FIELDS],
      ['WARNING', WARNING_LETTER_NAME, WARNING_LETTER_BODY, WARNING_LETTER_FIELDS],
    ];
    for (const [type, name, body, fields] of templates) {
      await queryRunner.query(
        `UPDATE "letter_templates"
         SET "name" = $1, "body_html" = $2, "fields_schema" = $3::jsonb, "is_active" = true,
             "version" = "version" + 1, "updated_at" = now()
         WHERE "type" = $4 AND "body_html" LIKE '%[PLACEHOLDER TEMPLATE%'`,
        [name, body, JSON.stringify(fields), type],
      );
    }
  }

  public async down(): Promise<void> {
    // Content-only change; the placeholder wording isn't worth restoring.
  }
}
