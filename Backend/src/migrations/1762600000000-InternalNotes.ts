import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Notes for HR" box on every create form (client decision, Nov 2026): one table for all record
 * kinds, read by HR / Admin only. Written by hand against entities/internal-note.entity.ts.
 */
export class InternalNotes1762600000000 implements MigrationInterface {
  name = 'InternalNotes1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "internal_notes" (
        "id" SERIAL PRIMARY KEY,
        "entity" character varying(40) NOT NULL,
        "entity_id" integer NOT NULL,
        "note" text NOT NULL,
        "created_by_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_internal_notes_entity" ON "internal_notes" ("entity", "entity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "internal_notes"`);
  }
}
