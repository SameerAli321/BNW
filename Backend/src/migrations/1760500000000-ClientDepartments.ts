import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Client feedback: the user-creation Department dropdown offers Personalised, Generalised, HR and
 * Operations. HR and Operations already exist; add the other two. Older departments are kept so
 * users already in them keep their department.
 */
export class ClientDepartments1760500000000 implements MigrationInterface {
  name = 'ClientDepartments1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "departments" ("name")
      VALUES ('Personalised'), ('Generalised'), ('HR'), ('Operations')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only remove the two new ones, and only if nobody has been put in them.
    await queryRunner.query(`
      DELETE FROM "departments" d
      WHERE d."name" IN ('Personalised', 'Generalised')
        AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."department_id" = d."id")
    `);
  }
}
