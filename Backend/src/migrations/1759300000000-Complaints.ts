import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Complaint form (digital version of the paper "Complaint Form" submitted to HR). Written by hand
 * against src/entities/complaint.entity.ts, same approach as every prior migration.
 */
export class Complaints1759300000000 implements MigrationInterface {
  name = 'Complaints1759300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."complaints_status_enum" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'RESOLVED');
    `);

    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id" SERIAL PRIMARY KEY,
        "complainant_id" integer NOT NULL,
        "contact_number" varchar(30),
        "description" text,
        "accessory_type" varchar(150),
        "accessory_description" text,
        "accessory_issue" text,
        "maintenance_area" varchar(150),
        "maintenance_description" text,
        "status" "public"."complaints_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "hr_comments" text,
        "hr_action_requested" text,
        "hr_acknowledgement" text,
        "hr_signature_text" varchar(255),
        "hr_representative_id" integer,
        "hr_signed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_complaints_complainant_id" FOREIGN KEY ("complainant_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_complaints_hr_representative_id" FOREIGN KEY ("hr_representative_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_complaints_complainant_id" ON "complaints" ("complainant_id");`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_complaints_status" ON "complaints" ("status");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_complaints_status";`);
    await queryRunner.query(`DROP INDEX "IDX_complaints_complainant_id";`);
    await queryRunner.query(`DROP TABLE "complaints";`);
    await queryRunner.query(`DROP TYPE "public"."complaints_status_enum";`);
  }
}
