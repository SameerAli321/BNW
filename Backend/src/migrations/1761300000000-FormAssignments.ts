import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "HR sends a form": form_assignments — HR / Admin ask an employee to fill in one of the existing
 * forms; it shows on their Requests & Forms page until done or cancelled. Written by hand against
 * src/entities/form-assignment.entity.ts, same approach as every prior migration.
 */
export class FormAssignments1761300000000 implements MigrationInterface {
  name = 'FormAssignments1761300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."form_assignments_form_type_enum" AS ENUM ('LEAVE', 'COMPLAINT', 'ATTENDANCE_REGULARIZATION', 'ONBOARDING', 'APPRAISAL', 'REIMBURSEMENT', 'EQUIPMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."form_assignments_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "form_assignments" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "form_type" "public"."form_assignments_form_type_enum" NOT NULL,
        "message" text,
        "due_date" date,
        "status" "public"."form_assignments_status_enum" NOT NULL DEFAULT 'PENDING',
        "assigned_by" integer,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_form_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_form_assignments_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_form_assignments_assigned_by" FOREIGN KEY ("assigned_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_form_assignments_user_id" ON "form_assignments" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_assignments_status" ON "form_assignments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_form_assignments_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_form_assignments_user_id"`);
    await queryRunner.query(`DROP TABLE "form_assignments"`);
    await queryRunner.query(`DROP TYPE "public"."form_assignments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."form_assignments_form_type_enum"`);
  }
}
