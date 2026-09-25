import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 5 (docs/API_CONTRACT_SPRINT5.md): candidates, joining_pack_items, joining_pack_acks —
 * the Hiring module (bulk CV upload, candidate management, convert-to-employee, joining pack).
 * Column names are snake_case (SnakeNamingStrategy); entity properties and API JSON stay
 * camelCase. Written by hand against src/entities/candidate.entity.ts,
 * joining-pack-item.entity.ts, joining-pack-ack.entity.ts — same approach as every prior
 * sprint's migration. Separate file — none of the existing migrations are touched. `synchronize`
 * stays `false`.
 */
export class Hiring1759050000000 implements MigrationInterface {
  name = 'Hiring1759050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."candidates_status_enum" AS ENUM ('NEW', 'SHORTLISTED', 'OFFERED', 'HIRED', 'REJECTED');
    `);

    await queryRunner.query(`
      CREATE TABLE "candidates" (
        "id" SERIAL PRIMARY KEY,
        "name" character varying(150) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(50),
        "cv_file_path" character varying(500) NOT NULL,
        "cv_original_name" character varying(255) NOT NULL,
        "cv_mime" character varying(150) NOT NULL,
        "cv_size" integer NOT NULL,
        "status" "public"."candidates_status_enum" NOT NULL DEFAULT 'NEW',
        "converted_user_id" integer,
        "uploaded_by" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_candidates_converted_user_id" FOREIGN KEY ("converted_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_candidates_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX "IDX_candidates_email" ON "candidates" ("email");`);
    await queryRunner.query(`CREATE INDEX "IDX_candidates_status" ON "candidates" ("status");`);

    await queryRunner.query(`
      CREATE TYPE "public"."joining_pack_items_kind_enum" AS ENUM ('OPERATING_GUIDE', 'TEAM_INTRO', 'POLICY_NOTE');
    `);

    await queryRunner.query(`
      CREATE TABLE "joining_pack_items" (
        "id" SERIAL PRIMARY KEY,
        "title" character varying(150) NOT NULL,
        "description" text,
        "kind" "public"."joining_pack_items_kind_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "joining_pack_acks" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "item_id" integer NOT NULL,
        "acknowledged_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_joining_pack_acks_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_joining_pack_acks_item_id" FOREIGN KEY ("item_id") REFERENCES "joining_pack_items"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_joining_pack_acks_user_item" UNIQUE ("user_id", "item_id")
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_joining_pack_acks_user_id" ON "joining_pack_acks" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_joining_pack_acks_item_id" ON "joining_pack_acks" ("item_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_joining_pack_acks_item_id";`);
    await queryRunner.query(`DROP INDEX "IDX_joining_pack_acks_user_id";`);
    await queryRunner.query(`DROP TABLE "joining_pack_acks";`);
    await queryRunner.query(`DROP TABLE "joining_pack_items";`);
    await queryRunner.query(`DROP TYPE "public"."joining_pack_items_kind_enum";`);

    await queryRunner.query(`DROP INDEX "IDX_candidates_status";`);
    await queryRunner.query(`DROP INDEX "IDX_candidates_email";`);
    await queryRunner.query(`DROP TABLE "candidates";`);
    await queryRunner.query(`DROP TYPE "public"."candidates_status_enum";`);
  }
}
