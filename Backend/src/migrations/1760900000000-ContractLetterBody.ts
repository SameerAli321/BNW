import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CONTRACT_LETTER_BODY,
  CONTRACT_LETTER_FIELDS,
  CONTRACT_LETTER_NAME,
} from '../letters/contract-letter-body';

/**
 * Replaces the Contract placeholder template with the owner's Contract of Employment wording
 * (letters/contract-letter-body.ts) and re-activates it so HR can issue contracts. Same rule as
 * HrLetterBodies: only a row still carrying the "[PLACEHOLDER TEMPLATE" marker is touched — a body
 * an admin has since rewritten is left alone.
 */
export class ContractLetterBody1760900000000 implements MigrationInterface {
  name = 'ContractLetterBody1760900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "letter_templates"
       SET "name" = $1, "body_html" = $2, "fields_schema" = $3::jsonb, "is_active" = true,
           "version" = "version" + 1, "updated_at" = now()
       WHERE "type" = 'CONTRACT' AND "body_html" LIKE '%[PLACEHOLDER TEMPLATE%'`,
      [CONTRACT_LETTER_NAME, CONTRACT_LETTER_BODY, JSON.stringify(CONTRACT_LETTER_FIELDS)],
    );
  }

  public async down(): Promise<void> {
    // Content-only change; the placeholder wording isn't worth restoring.
  }
}
