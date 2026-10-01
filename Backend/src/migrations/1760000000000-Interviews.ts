import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Interview scheduling for candidates (emailed invitations). Written by hand against
 * src/entities/interview.entity.ts, same approach as every prior migration.
 */
export class Interviews1760000000000 implements MigrationInterface {
  name = 'Interviews1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."interviews_mode_enum" AS ENUM ('ONLINE', 'IN_PERSON', 'PHONE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interviews_status_enum" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interviews_email_status_enum" AS ENUM ('SENT', 'FAILED', 'NOT_CONFIGURED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "interviews" (
        "id" SERIAL NOT NULL,
        "candidate_id" integer NOT NULL,
        "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration_minutes" integer NOT NULL DEFAULT 30,
        "mode" "public"."interviews_mode_enum" NOT NULL DEFAULT 'ONLINE',
        "meeting_link" character varying(500),
        "location" character varying(300),
        "interviewer_ids" integer array NOT NULL DEFAULT '{}',
        "message" text,
        "status" "public"."interviews_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "cancel_reason" text,
        "sequence" integer NOT NULL DEFAULT 0,
        "email_status" "public"."interviews_email_status_enum",
        "email_error" text,
        "email_sent_at" TIMESTAMP WITH TIME ZONE,
        "created_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interviews_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interviews_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_interviews_candidate_id" ON "interviews" ("candidate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_interviews_scheduled_at" ON "interviews" ("scheduled_at")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_interviews_status" ON "interviews" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "interviews"`);
    await queryRunner.query(`DROP TYPE "public"."interviews_email_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."interviews_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."interviews_mode_enum"`);
  }
}
