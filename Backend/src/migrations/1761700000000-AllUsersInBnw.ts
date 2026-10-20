import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client request: every current employee sits under BNW on the Team Hierarchy chart. Undoes the
 * first version of UserCompany1761600000000, which put HR / Admin users in the shared HR /
 * Administration team. Later moves to Hayes or the shared team are made on each user's profile.
 */
export class AllUsersInBnw1761700000000 implements MigrationInterface {
  name = 'AllUsersInBnw1761700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "users" SET "company" = 'BNW' WHERE "company" <> 'BNW'`);
  }

  public async down(): Promise<void> {
    // Nothing to undo — earlier company choices aren't kept.
  }
}
