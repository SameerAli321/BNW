import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the Sprint 0/1 core schema: roles, departments, users (self-referencing manager_id,
 * soft delete via deleted_at), refresh_tokens. Column names are snake_case (SnakeNamingStrategy);
 * entity properties and API JSON stay camelCase.
 *
 * Written by hand (not `migration:generate`) because no live Postgres instance was reachable in
 * this environment to diff against — see docs/BACKEND_STATUS.md. It mirrors the entities in
 * src/entities/*.ts exactly, including the enum type names TypeORM would generate itself
 * (`users_role_enum`, `users_status_enum`), so a future `migration:generate` run against this
 * schema should produce an empty diff.
 */
export class InitSchema1758540000000 implements MigrationInterface {
  name = 'InitSchema1758540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(150) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_departments_name" UNIQUE ("name")
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'CEO', 'PAYROLL', 'ADMIN');
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."users_status_enum" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "employee_code" varchar(30),
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "manager_id" integer,
        "department_id" integer,
        "designation" varchar(150),
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'ONBOARDING',
        "join_date" date,
        "must_change_password" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_users_employee_code" UNIQUE ("employee_code"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_manager_id" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_users_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_manager_id" ON "users" ("manager_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_department_id" ON "users" ("department_id");`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "jti" varchar(36) NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_tokens_jti" UNIQUE ("jti"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens";`);
    await queryRunner.query(`DROP INDEX "IDX_users_department_id";`);
    await queryRunner.query(`DROP INDEX "IDX_users_manager_id";`);
    await queryRunner.query(`DROP INDEX "IDX_users_email";`);
    await queryRunner.query(`DROP TABLE "users";`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum";`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum";`);
    await queryRunner.query(`DROP TABLE "departments";`);
    await queryRunner.query(`DROP TABLE "roles";`);
  }
}
