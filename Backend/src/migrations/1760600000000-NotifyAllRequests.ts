import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client feedback: HR / Admin / CEO can opt in to a notification (in-app + email) every time
 * anyone submits a request or form. Off by default.
 */
export class NotifyAllRequests1760600000000 implements MigrationInterface {
  name = 'NotifyAllRequests1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "notify_all_requests" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notify_all_requests"`);
  }
}
