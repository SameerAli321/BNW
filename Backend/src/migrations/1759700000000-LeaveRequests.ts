import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Leave / holiday (guide §3.4 R1/R2, §8.1 `leave_types` + `leave_requests`). Written by hand
 * against src/entities/leave-type.entity.ts and leave-request.entity.ts. Seeds four default leave
 * types — the client hasn't confirmed the leave policy yet (guide §12 B7); HR / ADMIN can change
 * the quotas from the Leave page.
 */
export class LeaveRequests1759700000000 implements MigrationInterface {
  name = 'LeaveRequests1759700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "leave_types" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(60) NOT NULL,
        "annual_quota" numeric(5,1),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_leave_types_name" UNIQUE ("name")
      );
    `);
    await queryRunner.query(`
      INSERT INTO "leave_types" ("name", "annual_quota", "sort_order") VALUES
        ('Annual Leave', 14, 1),
        ('Casual Leave', 10, 2),
        ('Sick Leave', 8, 3),
        ('Unpaid Leave', NULL, 4);
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."leave_requests_status_enum" AS ENUM ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED');
    `);
    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" integer NOT NULL,
        "leave_type_id" integer NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "half_day" boolean NOT NULL DEFAULT false,
        "days" numeric(5,1) NOT NULL,
        "reason" text NOT NULL,
        "contact_during_leave" varchar(100),
        "status" "public"."leave_requests_status_enum" NOT NULL DEFAULT 'PENDING_MANAGER',
        "manager_id" integer,
        "manager_approved" boolean,
        "manager_remarks" text,
        "manager_signature_text" varchar(255),
        "manager_signed_at" TIMESTAMP,
        "hr_approved" boolean,
        "hr_remarks" text,
        "hr_user_id" integer,
        "hr_signature_text" varchar(255),
        "hr_signed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_leave_requests_employee_id" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leave_requests_leave_type_id" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_leave_requests_manager_id" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_leave_requests_hr_user_id" FOREIGN KEY ("hr_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_leave_requests_dates" CHECK ("end_date" >= "start_date")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_employee_id" ON "leave_requests" ("employee_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_manager_id" ON "leave_requests" ("manager_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_status" ON "leave_requests" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_leave_requests_start_date" ON "leave_requests" ("start_date");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_leave_requests_start_date";`);
    await queryRunner.query(`DROP INDEX "IDX_leave_requests_status";`);
    await queryRunner.query(`DROP INDEX "IDX_leave_requests_manager_id";`);
    await queryRunner.query(`DROP INDEX "IDX_leave_requests_employee_id";`);
    await queryRunner.query(`DROP TABLE "leave_requests";`);
    await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum";`);
    await queryRunner.query(`DROP TABLE "leave_types";`);
  }
}
