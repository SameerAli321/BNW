import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Announcement board (guide §3.4 R4, §5.6, §8.1 `announcements`). Written by hand against
 * src/entities/announcement.entity.ts, same approach as every prior migration.
 */
export class Announcements1759800000000 implements MigrationInterface {
  name = 'Announcements1759800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."announcements_audience_enum" AS ENUM ('ALL', 'DEPARTMENT');
    `);
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" SERIAL PRIMARY KEY,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "posted_by" integer,
        "audience" "public"."announcements_audience_enum" NOT NULL DEFAULT 'ALL',
        "department_id" integer,
        "pinned" boolean NOT NULL DEFAULT false,
        "expires_on" date,
        "email_sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_announcements_posted_by" FOREIGN KEY ("posted_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_announcements_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_announcements_expires_on" ON "announcements" ("expires_on");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_announcements_created_at" ON "announcements" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_announcements_created_at";`);
    await queryRunner.query(`DROP INDEX "IDX_announcements_expires_on";`);
    await queryRunner.query(`DROP TABLE "announcements";`);
    await queryRunner.query(`DROP TYPE "public"."announcements_audience_enum";`);
  }
}
