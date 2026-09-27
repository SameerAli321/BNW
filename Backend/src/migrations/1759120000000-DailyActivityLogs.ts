import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Daily activity log (docs/API_CONTRACT_ACTIVITY_LOG.md; guide §3.1 U3, §8.1
 * `daily_activity_logs`). Written by hand against src/entities/daily-activity-log.entity.ts, same
 * approach as every prior migration. Separate file — none of the existing migrations are touched.
 */
export class DailyActivityLogs1759120000000 implements MigrationInterface {
  name = 'DailyActivityLogs1759120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."daily_activity_logs_category_enum" AS ENUM ('CLIENT_WORK', 'INTERNAL', 'MEETING', 'TRAINING', 'ADMINISTRATIVE', 'OTHER');
    `);

    await queryRunner.query(`
      CREATE TABLE "daily_activity_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "activity_date" date NOT NULL,
        "category" "public"."daily_activity_logs_category_enum" NOT NULL DEFAULT 'CLIENT_WORK',
        "hours" numeric(4,2) NOT NULL,
        "description" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_daily_activity_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_daily_activity_logs_hours" CHECK ("hours" > 0 AND "hours" <= 24)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_daily_activity_logs_user_id" ON "daily_activity_logs" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_daily_activity_logs_activity_date" ON "daily_activity_logs" ("activity_date");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_daily_activity_logs_activity_date";`);
    await queryRunner.query(`DROP INDEX "IDX_daily_activity_logs_user_id";`);
    await queryRunner.query(`DROP TABLE "daily_activity_logs";`);
    await queryRunner.query(`DROP TYPE "public"."daily_activity_logs_category_enum";`);
  }
}
