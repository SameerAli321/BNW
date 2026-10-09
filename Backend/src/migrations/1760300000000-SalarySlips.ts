import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Salary slips — one current slip per employee per month (partial unique index), older revisions
 * kept with superseded_at set. Written by hand against src/entities/salary-slip.entity.ts.
 */
export class SalarySlips1760300000000 implements MigrationInterface {
  name = 'SalarySlips1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."salary_slips_email_status_enum" AS ENUM ('NOT_SENT', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "salary_slips" (
        "id" SERIAL NOT NULL,
        "employee_id" integer NOT NULL,
        "salary_month" character varying(7) NOT NULL,
        "revision" integer NOT NULL DEFAULT 1,
        "employee_name" character varying(201) NOT NULL,
        "employee_code" character varying(30),
        "designation" character varying(150),
        "department_name" character varying(150),
        "basic_salary" numeric(12,2) NOT NULL,
        "allowances" jsonb NOT NULL DEFAULT '[]',
        "bonus" numeric(12,2) NOT NULL DEFAULT 0,
        "overtime" numeric(12,2) NOT NULL DEFAULT 0,
        "deductions" jsonb NOT NULL DEFAULT '[]',
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "total_allowances" numeric(12,2) NOT NULL,
        "gross_salary" numeric(12,2) NOT NULL,
        "total_deductions" numeric(12,2) NOT NULL,
        "net_salary" numeric(12,2) NOT NULL,
        "payment_date" date,
        "payment_method" character varying(40),
        "bank_name" character varying(150),
        "bank_account_number" character varying(60),
        "working_days" integer,
        "notes" text,
        "pdf_path" character varying(500),
        "email_status" "public"."salary_slips_email_status_enum" NOT NULL DEFAULT 'NOT_SENT',
        "emailed_to" character varying(255),
        "email_sent_at" TIMESTAMP WITH TIME ZONE,
        "email_error" text,
        "email_attempts" integer NOT NULL DEFAULT 0,
        "last_email_attempt_at" TIMESTAMP WITH TIME ZONE,
        "generated_by_id" integer,
        "superseded_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_salary_slips_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_salary_slips_month" CHECK ("salary_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
        CONSTRAINT "FK_salary_slips_employee" FOREIGN KEY ("employee_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_salary_slips_generated_by" FOREIGN KEY ("generated_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_salary_slips_employee_id" ON "salary_slips" ("employee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_salary_slips_salary_month" ON "salary_slips" ("salary_month")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_salary_slips_email_status" ON "salary_slips" ("email_status")`,
    );
    // No duplicate current slips for the same employee + month.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_salary_slips_current" ON "salary_slips" ("employee_id", "salary_month") WHERE "superseded_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "salary_slips"`);
    await queryRunner.query(`DROP TYPE "public"."salary_slips_email_status_enum"`);
  }
}
