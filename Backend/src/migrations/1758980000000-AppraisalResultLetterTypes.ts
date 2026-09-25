import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds two new letter types — APPRECIATION and APPRAISAL_REJECTION — sent by HR once an appraisal
 * reaches a final CEO decision. See docs/API_CONTRACT_SPRINT4.md addendum. `ALTER TYPE ... ADD
 * VALUE` is transaction-safe on Postgres 12+ as long as the new value isn't used in the same
 * transaction, which it isn't here (row seeding happens separately via seed.ts).
 */
export class AppraisalResultLetterTypes1758980000000 implements MigrationInterface {
  name = 'AppraisalResultLetterTypes1758980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."letter_templates_type_enum" ADD VALUE 'APPRECIATION';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."letter_templates_type_enum" ADD VALUE 'APPRAISAL_REJECTION';`,
    );
    await queryRunner.query(`ALTER TYPE "public"."letters_type_enum" ADD VALUE 'APPRECIATION';`);
    await queryRunner.query(
      `ALTER TYPE "public"."letters_type_enum" ADD VALUE 'APPRAISAL_REJECTION';`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop a single enum value; reverting would require rebuilding both enum
    // types from scratch (and any dependent columns), which is out of scope for a `down()` here —
    // consistent with how enum growth is otherwise handled in this project (this only ever adds).
  }
}
