import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hayes staff only see Hayes on the company-wide pages (client checklist, Nov 2026). Announcements
 * can now be for one company: announcements.company = 'BNW' / 'HAYES', or NULL for both (every
 * existing announcement stays for both). Written by hand against the entity.
 */
export class AnnouncementCompany1762400000000 implements MigrationInterface {
  name = 'AnnouncementCompany1762400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "company" character varying(10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN IF EXISTS "company"`);
  }
}
