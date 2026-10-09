import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Profile pictures — each user can upload their own. Only the randomized file name is stored;
 * the image lives under uploads/avatars/ (see src/users/avatar.storage.ts).
 */
export class UserAvatars1759900000000 implements MigrationInterface {
  name = 'UserAvatars1759900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_path" varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_path"`);
  }
}
