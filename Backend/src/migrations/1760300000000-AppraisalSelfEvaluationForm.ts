import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stores the full BNW Self Evaluation Form on each appraisal request (employee/line-manager
 * details, appraisal duration, 10 rated competencies with reasons, summary remarks). Nullable:
 * requests submitted before the form existed keep only their free-text `self_evaluation`.
 */
export class AppraisalSelfEvaluationForm1760300000000 implements MigrationInterface {
  name = 'AppraisalSelfEvaluationForm1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appraisal_requests" ADD COLUMN "self_evaluation_form" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appraisal_requests" DROP COLUMN "self_evaluation_form"`);
  }
}
