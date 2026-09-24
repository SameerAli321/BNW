import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 3: Letter engine schema — letter_templates, letters, letter_events, signatures. See
 * docs/API_CONTRACT_SPRINT3.md "New tables". Column names are snake_case (SnakeNamingStrategy);
 * entity properties and API JSON stay camelCase. Written by hand against the entities in
 * src/entities/letter-template.entity.ts, letter.entity.ts, letter-event.entity.ts,
 * signature.entity.ts — same approach as 1758540000000-InitSchema.ts /
 * 1758630000000-EmployeeDocuments.ts. Separate file — Sprint 1/2 migrations are untouched.
 */
export class Letters1758720000000 implements MigrationInterface {
  name = 'Letters1758720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."letter_templates_type_enum" AS ENUM ('OFFER', 'CONTRACT', 'REDUNDANCY', 'TERMS_CHANGE', 'WARNING', 'EXPERIENCE');
    `);

    await queryRunner.query(`
      CREATE TABLE "letter_templates" (
        "id" SERIAL PRIMARY KEY,
        "type" "public"."letter_templates_type_enum" NOT NULL,
        "name" varchar(150) NOT NULL,
        "role_scope" varchar(150),
        "body_html" text NOT NULL,
        "fields_schema" jsonb NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."letters_type_enum" AS ENUM ('OFFER', 'CONTRACT', 'REDUNDANCY', 'TERMS_CHANGE', 'WARNING', 'EXPERIENCE');
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."letters_status_enum" AS ENUM ('DRAFT', 'PENDING_CEO', 'CHANGES_REQUESTED', 'CEO_SIGNED', 'SENT_TO_EMPLOYEE', 'SIGNED', 'ARCHIVED', 'CANCELLED');
    `);

    await queryRunner.query(`
      CREATE TABLE "letters" (
        "id" SERIAL PRIMARY KEY,
        "template_id" integer NOT NULL,
        "type" "public"."letters_type_enum" NOT NULL,
        "subject_user_id" integer NOT NULL,
        "prepared_by" integer NOT NULL,
        "field_values" jsonb NOT NULL DEFAULT '{}',
        "pdf_path" varchar(500),
        "status" "public"."letters_status_enum" NOT NULL DEFAULT 'DRAFT',
        "current_version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_letters_template_id" FOREIGN KEY ("template_id") REFERENCES "letter_templates"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_letters_subject_user_id" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_letters_prepared_by" FOREIGN KEY ("prepared_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_letters_subject_user_id" ON "letters" ("subject_user_id");`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_letters_status" ON "letters" ("status");`);

    await queryRunner.query(`
      CREATE TYPE "public"."letter_events_action_enum" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'CEO_SIGNED', 'SENT_TO_EMPLOYEE', 'EMPLOYEE_SIGNED', 'CANCELLED');
    `);

    await queryRunner.query(`
      CREATE TABLE "letter_events" (
        "id" SERIAL PRIMARY KEY,
        "letter_id" integer NOT NULL,
        "actor_id" integer NOT NULL,
        "action" "public"."letter_events_action_enum" NOT NULL,
        "comment" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_letter_events_letter_id" FOREIGN KEY ("letter_id") REFERENCES "letters"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_letter_events_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_letter_events_letter_id" ON "letter_events" ("letter_id");`,
    );

    await queryRunner.query(`
      CREATE TABLE "signatures" (
        "id" SERIAL PRIMARY KEY,
        "letter_id" integer NOT NULL,
        "signer_id" integer NOT NULL,
        "signer_role" varchar(30) NOT NULL,
        "signature_text" varchar(255) NOT NULL,
        "signed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "ip_address" varchar(64),
        "user_agent" varchar(500),
        "document_hash" varchar(64) NOT NULL,
        CONSTRAINT "FK_signatures_letter_id" FOREIGN KEY ("letter_id") REFERENCES "letters"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_signatures_signer_id" FOREIGN KEY ("signer_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_signatures_letter_id" ON "signatures" ("letter_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_signatures_letter_id";`);
    await queryRunner.query(`DROP TABLE "signatures";`);

    await queryRunner.query(`DROP INDEX "IDX_letter_events_letter_id";`);
    await queryRunner.query(`DROP TABLE "letter_events";`);
    await queryRunner.query(`DROP TYPE "public"."letter_events_action_enum";`);

    await queryRunner.query(`DROP INDEX "IDX_letters_status";`);
    await queryRunner.query(`DROP INDEX "IDX_letters_subject_user_id";`);
    await queryRunner.query(`DROP TABLE "letters";`);
    await queryRunner.query(`DROP TYPE "public"."letters_status_enum";`);
    await queryRunner.query(`DROP TYPE "public"."letters_type_enum";`);

    await queryRunner.query(`DROP TABLE "letter_templates";`);
    await queryRunner.query(`DROP TYPE "public"."letter_templates_type_enum";`);
  }
}
