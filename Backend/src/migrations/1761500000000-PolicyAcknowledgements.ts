import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Employee Policy Handbook (About us page): each employee's signed acknowledgement, one per
 * handbook version. Written by hand against src/entities/policy-acknowledgement.entity.ts.
 */
export class PolicyAcknowledgements1761500000000 implements MigrationInterface {
  name = 'PolicyAcknowledgements1761500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "policy_acknowledgements" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "policy_version" character varying(30) NOT NULL,
        "signature_text" character varying(255) NOT NULL,
        "ip_address" character varying(64),
        "user_agent" character varying(500),
        "sent_to" jsonb NOT NULL DEFAULT '[]',
        "acknowledged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_acknowledgements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_policy_acknowledgements_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_policy_acknowledgements_user_version" ON "policy_acknowledgements" ("user_id", "policy_version")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_policy_acknowledgements_user_version"`);
    await queryRunner.query(`DROP TABLE "policy_acknowledgements"`);
  }
}
