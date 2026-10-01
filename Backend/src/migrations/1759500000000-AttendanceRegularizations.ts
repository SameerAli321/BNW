import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Attendance regularization form (digital version of the HRD's paper "Regularization of
 * Attendance Recorded in HRD" form). Written by hand against
 * src/entities/attendance-regularization.entity.ts, same approach as every prior migration.
 */
export class AttendanceRegularizations1759500000000 implements MigrationInterface {
  name = 'AttendanceRegularizations1759500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."attendance_regularizations_status_enum" AS ENUM ('PENDING_HOD', 'HOD_NOT_RECOMMENDED', 'PENDING_HR', 'TAKEN_ON_RECORD', 'NOT_IN_ORDER');
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."attendance_regularizations_hr_decision_enum" AS ENUM ('TAKEN_ON_RECORD', 'NOT_IN_ORDER');
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance_regularizations" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" integer NOT NULL,
        "attendance_date" date NOT NULL,
        "time_arrival" varchar(5),
        "time_departure" varchar(5),
        "reason" text NOT NULL,
        "status" "public"."attendance_regularizations_status_enum" NOT NULL DEFAULT 'PENDING_HOD',
        "hod_id" integer,
        "hod_recommended" boolean,
        "hod_remarks" text,
        "hod_signature_text" varchar(255),
        "hod_signed_at" TIMESTAMP,
        "hr_decision" "public"."attendance_regularizations_hr_decision_enum",
        "hr_remarks" text,
        "hr_user_id" integer,
        "hr_signature_text" varchar(255),
        "hr_signed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_attendance_regularizations_employee_id" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_attendance_regularizations_hod_id" FOREIGN KEY ("hod_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_attendance_regularizations_hr_user_id" FOREIGN KEY ("hr_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_regularizations_employee_id" ON "attendance_regularizations" ("employee_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_regularizations_hod_id" ON "attendance_regularizations" ("hod_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_regularizations_status" ON "attendance_regularizations" ("status");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_attendance_regularizations_status";`);
    await queryRunner.query(`DROP INDEX "IDX_attendance_regularizations_hod_id";`);
    await queryRunner.query(`DROP INDEX "IDX_attendance_regularizations_employee_id";`);
    await queryRunner.query(`DROP TABLE "attendance_regularizations";`);
    await queryRunner.query(`DROP TYPE "public"."attendance_regularizations_hr_decision_enum";`);
    await queryRunner.query(`DROP TYPE "public"."attendance_regularizations_status_enum";`);
  }
}
