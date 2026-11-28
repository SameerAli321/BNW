import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * More than one reporting manager (client request, Nov 2026): `manager_id` stays the main one
 * (Team chart line, PDFs); the others go in `additional_manager_ids` and get the same rights.
 */
export class AdditionalManagers1762700000000 implements MigrationInterface {
  name = 'AdditionalManagers1762700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "additional_manager_ids" integer[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "additional_manager_ids"`);
  }
}
