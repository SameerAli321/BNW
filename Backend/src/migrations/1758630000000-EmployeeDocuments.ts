import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 2: E-record schema — document_types, employee_documents, document_requests.
 * See docs/API_CONTRACT_SPRINT2.md "New tables". Column names are snake_case
 * (SnakeNamingStrategy); entity properties and API JSON stay camelCase.
 *
 * Written by hand against the entities in src/entities/document-type.entity.ts,
 * src/entities/employee-document.entity.ts, src/entities/document-request.entity.ts — same
 * approach as 1758540000000-InitSchema.ts (see that file's header / docs/BACKEND_STATUS.md for
 * why: no live Postgres was reachable to diff against when this was first drafted).
 */
export class EmployeeDocuments1758630000000 implements MigrationInterface {
  name = 'EmployeeDocuments1758630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_types" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(150) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_document_types_name" UNIQUE ("name")
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."employee_documents_source_enum" AS ENUM ('UPLOAD', 'LETTER', 'CONTRACT', 'APPRAISAL', 'CV');
    `);

    await queryRunner.query(`
      CREATE TABLE "employee_documents" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "document_type_id" integer NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "mime" varchar(150) NOT NULL,
        "size" integer NOT NULL,
        "source" "public"."employee_documents_source_enum" NOT NULL DEFAULT 'UPLOAD',
        "uploaded_by" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_employee_documents_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_documents_document_type_id" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_employee_documents_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_employee_documents_user_id" ON "employee_documents" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_employee_documents_document_type_id" ON "employee_documents" ("document_type_id");`,
    );

    await queryRunner.query(`
      CREATE TYPE "public"."document_requests_status_enum" AS ENUM ('REQUESTED', 'RECEIVED');
    `);

    await queryRunner.query(`
      CREATE TABLE "document_requests" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL,
        "document_type_id" integer NOT NULL,
        "requested_by" integer NOT NULL,
        "status" "public"."document_requests_status_enum" NOT NULL DEFAULT 'REQUESTED',
        "due_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_document_requests_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_requests_document_type_id" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_document_requests_requested_by" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_document_requests_user_id" ON "document_requests" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_requests_document_type_id" ON "document_requests" ("document_type_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_document_requests_document_type_id";`);
    await queryRunner.query(`DROP INDEX "IDX_document_requests_user_id";`);
    await queryRunner.query(`DROP TABLE "document_requests";`);
    await queryRunner.query(`DROP TYPE "public"."document_requests_status_enum";`);

    await queryRunner.query(`DROP INDEX "IDX_employee_documents_document_type_id";`);
    await queryRunner.query(`DROP INDEX "IDX_employee_documents_user_id";`);
    await queryRunner.query(`DROP TABLE "employee_documents";`);
    await queryRunner.query(`DROP TYPE "public"."employee_documents_source_enum";`);

    await queryRunner.query(`DROP TABLE "document_types";`);
  }
}
