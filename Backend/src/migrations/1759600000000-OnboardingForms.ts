import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Employee onboarding form (digital version of BNW's paper "Employee Onboarding Form"). Written by
 * hand against src/entities/onboarding-form.entity.ts, same approach as every prior migration.
 * Also adds the "Onboarding Form" document type and the ONBOARDING document source used when HR
 * files the PDF copy into the employee's E-record. The new enum value is only used at runtime,
 * never in this transaction, so `ADD VALUE` here is safe.
 */
export class OnboardingForms1759600000000 implements MigrationInterface {
  name = 'OnboardingForms1759600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."employee_documents_source_enum" ADD VALUE IF NOT EXISTS 'ONBOARDING';`,
    );
    await queryRunner.query(
      `INSERT INTO "document_types" ("name")
       SELECT 'Onboarding Form' WHERE NOT EXISTS (SELECT 1 FROM "document_types" WHERE "name" = 'Onboarding Form');`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."onboarding_forms_status_enum" AS ENUM ('SUBMITTED', 'RECORDED');
    `);
    await queryRunner.query(`
      CREATE TABLE "onboarding_forms" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "date_of_birth" date,
        "national_id" varchar(60),
        "street_address" varchar(255),
        "city" varchar(100),
        "state" varchar(100),
        "zip_code" varchar(20),
        "phone" varchar(30),
        "reason_for_leaving" text,
        "work_responsibilities" text,
        "emergency_contact_name" varchar(150),
        "emergency_contact_relationship" varchar(60),
        "emergency_contact_phone" varchar(30),
        "emergency_contact_address" text,
        "bank_name" varchar(150),
        "account_title" varchar(150),
        "account_number" varchar(60),
        "iban" varchar(40),
        "medical_condition" text,
        "employee_signature_text" varchar(255) NOT NULL,
        "employee_signed_at" TIMESTAMP NOT NULL,
        "status" "public"."onboarding_forms_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "hr_recorded_to" varchar(255),
        "hr_comments" text,
        "hr_user_id" integer,
        "hr_signature_text" varchar(255),
        "hr_signed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_onboarding_forms_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_onboarding_forms_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_onboarding_forms_hr_user_id" FOREIGN KEY ("hr_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_onboarding_forms_status" ON "onboarding_forms" ("status");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_onboarding_forms_status";`);
    await queryRunner.query(`DROP TABLE "onboarding_forms";`);
    await queryRunner.query(`DROP TYPE "public"."onboarding_forms_status_enum";`);
    // The ONBOARDING enum value and the document type are left in place (Postgres can't drop a
    // single enum value; filed documents may reference the type).
  }
}
