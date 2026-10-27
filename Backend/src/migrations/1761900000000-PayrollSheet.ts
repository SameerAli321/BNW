import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The client's "Payroll for IT" sheet: a monthly payroll entry per employee (the manual inputs),
 * employee loans repaid in monthly instalments, and the sheet's figures on salary slips
 * (scheme = 'PAYROLL'). Existing slips stay 'LEGACY' and keep their allowances / bonus / overtime.
 * Written by hand against the payroll-entry, employee-loan and salary-slip entities.
 */
export class PayrollSheet1761900000000 implements MigrationInterface {
  name = 'PayrollSheet1761900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."employee_loans_status_enum" AS ENUM ('ACTIVE', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "employee_loans" (
        "id" SERIAL NOT NULL,
        "employee_id" integer NOT NULL,
        "principal" numeric(12,2) NOT NULL,
        "instalments" integer NOT NULL,
        "start_month" character varying(7) NOT NULL,
        "status" "public"."employee_loans_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "created_by_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_loans_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_employee_loans_principal" CHECK ("principal" > 0),
        CONSTRAINT "CHK_employee_loans_instalments" CHECK ("instalments" BETWEEN 1 AND 60),
        CONSTRAINT "CHK_employee_loans_month" CHECK ("start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
        CONSTRAINT "FK_employee_loans_employee" FOREIGN KEY ("employee_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_loans_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_employee_loans_employee_id" ON "employee_loans" ("employee_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payroll_entries" (
        "id" SERIAL NOT NULL,
        "employee_id" integer NOT NULL,
        "salary_month" character varying(7) NOT NULL,
        "gross_salary" numeric(12,2) NOT NULL,
        "working_days" integer NOT NULL,
        "unpaid_days" numeric(5,2) NOT NULL DEFAULT 0,
        "security_mode" character varying(12) NOT NULL DEFAULT 'NONE',
        "security_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "loan_override" numeric(12,2),
        "non_taxable_addition" numeric(12,2) NOT NULL DEFAULT 0,
        "taxable_addition" numeric(12,2) NOT NULL DEFAULT 0,
        "paid" numeric(12,2) NOT NULL DEFAULT 0,
        "updated_by_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payroll_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_payroll_entries_month" CHECK ("salary_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
        CONSTRAINT "FK_payroll_entries_employee" FOREIGN KEY ("employee_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payroll_entries_employee_month" ON "payroll_entries" ("employee_id", "salary_month")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payroll_entries_salary_month" ON "payroll_entries" ("salary_month")`,
    );

    await queryRunner.query(`
      ALTER TABLE "salary_slips"
        ADD "scheme" character varying(10) NOT NULL DEFAULT 'LEGACY',
        ADD "national_id" character varying(30),
        ADD "unpaid_days" numeric(5,2) NOT NULL DEFAULT 0,
        ADD "per_day_salary" numeric(12,2),
        ADD "unpaid_deduction" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "security_mode" character varying(12),
        ADD "security_deduction" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "loan_deduction" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "loan_id" integer,
        ADD "loan_instalment_no" integer,
        ADD "loan_instalments" integer,
        ADD "loan_balance_after" numeric(12,2),
        ADD "non_taxable_addition" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "taxable_addition" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "taxable_salary" numeric(12,2),
        ADD CONSTRAINT "FK_salary_slips_loan" FOREIGN KEY ("loan_id")
          REFERENCES "employee_loans"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_salary_slips_loan_id" ON "salary_slips" ("loan_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_salary_slips_loan_id"`);
    await queryRunner.query(`
      ALTER TABLE "salary_slips"
        DROP CONSTRAINT "FK_salary_slips_loan",
        DROP COLUMN "taxable_salary",
        DROP COLUMN "taxable_addition",
        DROP COLUMN "non_taxable_addition",
        DROP COLUMN "loan_balance_after",
        DROP COLUMN "loan_instalments",
        DROP COLUMN "loan_instalment_no",
        DROP COLUMN "loan_id",
        DROP COLUMN "loan_deduction",
        DROP COLUMN "security_deduction",
        DROP COLUMN "security_mode",
        DROP COLUMN "unpaid_deduction",
        DROP COLUMN "per_day_salary",
        DROP COLUMN "unpaid_days",
        DROP COLUMN "national_id",
        DROP COLUMN "scheme"
    `);
    await queryRunner.query(`DROP TABLE "payroll_entries"`);
    await queryRunner.query(`DROP TABLE "employee_loans"`);
    await queryRunner.query(`DROP TYPE "public"."employee_loans_status_enum"`);
  }
}
