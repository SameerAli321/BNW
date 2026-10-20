import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Letters for candidates: HR can prepare a contract / offer letter for a hiring candidate before
 * they have a user account. `letters.subject_user_id` becomes nullable and a letter may instead
 * point at `subject_candidate_id`; on conversion the candidate's letters get the new user's id
 * (subject_candidate_id is kept for history). At least one of the two must be set. Written by hand
 * against src/entities/letter.entity.ts, same approach as every prior migration.
 */
export class CandidateLetters1761100000000 implements MigrationInterface {
  name = 'CandidateLetters1761100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "letters" ALTER COLUMN "subject_user_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "letters" ADD COLUMN "subject_candidate_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "letters" ADD CONSTRAINT "FK_letters_subject_candidate_id" FOREIGN KEY ("subject_candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_letters_subject_candidate_id" ON "letters" ("subject_candidate_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "letters" ADD CONSTRAINT "CHK_letters_subject" CHECK ("subject_user_id" IS NOT NULL OR "subject_candidate_id" IS NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Letters that never moved onto a user account can't satisfy NOT NULL again — drop them.
    await queryRunner.query(`DELETE FROM "letters" WHERE "subject_user_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "letters" DROP CONSTRAINT "CHK_letters_subject"`);
    await queryRunner.query(`DROP INDEX "IDX_letters_subject_candidate_id"`);
    await queryRunner.query(
      `ALTER TABLE "letters" DROP CONSTRAINT "FK_letters_subject_candidate_id"`,
    );
    await queryRunner.query(`ALTER TABLE "letters" DROP COLUMN "subject_candidate_id"`);
    await queryRunner.query(`ALTER TABLE "letters" ALTER COLUMN "subject_user_id" SET NOT NULL`);
  }
}
