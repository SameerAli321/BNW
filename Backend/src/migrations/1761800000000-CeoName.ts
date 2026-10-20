import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The seeded CEO account was named "CEO User" — give it the CEO's real name and title (shown at the
 * top of the Team Hierarchy chart and on CEO-signed letters). Only touches the account while it
 * still has the placeholder name, so a name changed in Users → Edit is never overwritten.
 */
export class CeoName1761800000000 implements MigrationInterface {
  name = 'CeoName1761800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "first_name" = 'Shahzada H',
          "last_name" = 'Israr',
          "designation" = COALESCE(NULLIF("designation", ''), 'Chief Executive Officer')
      WHERE "email" = 'ceo@bnw.local' AND "first_name" = 'CEO' AND "last_name" = 'User'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" SET "first_name" = 'CEO', "last_name" = 'User'
      WHERE "email" = 'ceo@bnw.local' AND "first_name" = 'Shahzada H' AND "last_name" = 'Israr'
    `);
  }
}
