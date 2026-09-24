import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 4 (docs/API_CONTRACT_SPRINT4.md): appraisal_requests, appraisal_events — the
 * employee-initiated quarterly appraisal request flow. See that contract's "Deviation from the
 * original guide" note: this is NOT the guide's §3.2/§5.2 HR-scheduled cycle model, it's a
 * simpler employee-initiated flow specified directly by the user — see
 * docs/BACKEND_STATUS.md's "Sprint 4 — Appraisals" section. Column names are snake_case
 * (SnakeNamingStrategy); entity properties and API JSON stay camelCase. Written by hand against
 * src/entities/appraisal-request.entity.ts, appraisal-event.entity.ts — same approach as the
 * Sprint 1/2/3 and gap-fix migrations. Separate file — none of the existing migrations are
 * touched. `synchronize` stays `false`.
 */
export class Appraisals1758900000000 implements MigrationInterface {
  name = 'Appraisals1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_requests_status_enum" AS ENUM ('PENDING_MANAGER', 'MANAGER_REJECTED', 'PENDING_CEO', 'CEO_ACCEPTED', 'CEO_REJECTED');
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_requests_manager_decision_enum" AS ENUM ('ACCEPTED', 'REJECTED');
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_requests_ceo_decision_enum" AS ENUM ('ACCEPTED', 'REJECTED', 'SEND_BACK');
    `);

    await queryRunner.query(`
      CREATE TABLE "appraisal_requests" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" integer NOT NULL,
        "self_evaluation" text NOT NULL,
        "status" "public"."appraisal_requests_status_enum" NOT NULL DEFAULT 'PENDING_MANAGER',
        "manager_id" integer,
        "manager_remarks" text,
        "manager_message" text,
        "manager_decision" "public"."appraisal_requests_manager_decision_enum",
        "manager_decided_at" TIMESTAMP,
        "ceo_remarks" text,
        "ceo_message" text,
        "ceo_decision" "public"."appraisal_requests_ceo_decision_enum",
        "ceo_decided_at" TIMESTAMP,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_appraisal_requests_employee_id" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appraisal_requests_manager_id" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_appraisal_requests_employee_id" ON "appraisal_requests" ("employee_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appraisal_requests_manager_id" ON "appraisal_requests" ("manager_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appraisal_requests_status" ON "appraisal_requests" ("status");`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_events_action_enum" AS ENUM ('SUBMITTED', 'MANAGER_ACCEPTED', 'MANAGER_REJECTED', 'CEO_ACCEPTED', 'CEO_REJECTED', 'CEO_SENT_BACK');
    `);

    await queryRunner.query(`
      CREATE TABLE "appraisal_events" (
        "id" SERIAL PRIMARY KEY,
        "appraisal_request_id" integer NOT NULL,
        "actor_id" integer NOT NULL,
        "action" "public"."appraisal_events_action_enum" NOT NULL,
        "message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_appraisal_events_appraisal_request_id" FOREIGN KEY ("appraisal_request_id") REFERENCES "appraisal_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appraisal_events_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_appraisal_events_appraisal_request_id" ON "appraisal_events" ("appraisal_request_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_appraisal_events_appraisal_request_id";`);
    await queryRunner.query(`DROP TABLE "appraisal_events";`);
    await queryRunner.query(`DROP TYPE "public"."appraisal_events_action_enum";`);

    await queryRunner.query(`DROP INDEX "IDX_appraisal_requests_status";`);
    await queryRunner.query(`DROP INDEX "IDX_appraisal_requests_manager_id";`);
    await queryRunner.query(`DROP INDEX "IDX_appraisal_requests_employee_id";`);
    await queryRunner.query(`DROP TABLE "appraisal_requests";`);
    await queryRunner.query(`DROP TYPE "public"."appraisal_requests_ceo_decision_enum";`);
    await queryRunner.query(`DROP TYPE "public"."appraisal_requests_manager_decision_enum";`);
    await queryRunner.query(`DROP TYPE "public"."appraisal_requests_status_enum";`);
  }
}
