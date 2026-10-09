import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Work orders (reimbursement claims + equipment requests) and the app_settings key/value table
 * (seeded with the PKR 50,000 CEO-approval limit). Written by hand against
 * src/entities/work-order.entity.ts and app-setting.entity.ts.
 */
export class WorkOrders1760100000000 implements MigrationInterface {
  name = 'WorkOrders1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_settings" (
        "key" character varying(100) NOT NULL,
        "value" jsonb NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings_key" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(
      `INSERT INTO "app_settings" ("key", "value") VALUES ('work_orders.ceo_approval_limit', '50000')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_type_enum" AS ENUM ('REIMBURSEMENT', 'EQUIPMENT')`,
    );
    await queryRunner.query(`
      CREATE TYPE "public"."work_orders_status_enum" AS ENUM
        ('PENDING_MANAGER', 'PENDING_CEO', 'PENDING_PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TABLE "work_orders" (
        "id" SERIAL NOT NULL,
        "employee_id" integer NOT NULL,
        "type" "public"."work_orders_type_enum" NOT NULL,
        "title" character varying(200) NOT NULL,
        "category" character varying(60) NOT NULL,
        "description" text NOT NULL,
        "amount" numeric(12,2),
        "expense_date" date,
        "quantity" integer,
        "needed_by" date,
        "receipt_path" character varying(500),
        "receipt_original_name" character varying(255),
        "receipt_mime" character varying(150),
        "status" "public"."work_orders_status_enum" NOT NULL,
        "ceo_required" boolean NOT NULL DEFAULT false,
        "manager_id" integer,
        "manager_approved" boolean,
        "manager_remarks" text,
        "manager_signature_text" character varying(255),
        "manager_signed_at" TIMESTAMP WITH TIME ZONE,
        "ceo_user_id" integer,
        "ceo_approved" boolean,
        "ceo_remarks" text,
        "ceo_signature_text" character varying(255),
        "ceo_signed_at" TIMESTAMP WITH TIME ZONE,
        "processor_id" integer,
        "processor_approved" boolean,
        "processor_remarks" text,
        "processor_reference" character varying(200),
        "processor_signature_text" character varying(255),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_orders_employee" FOREIGN KEY ("employee_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_work_orders_manager" FOREIGN KEY ("manager_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_work_orders_ceo" FOREIGN KEY ("ceo_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_work_orders_processor" FOREIGN KEY ("processor_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_work_orders_employee_id" ON "work_orders" ("employee_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_work_orders_type" ON "work_orders" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_work_orders_status" ON "work_orders" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_work_orders_manager_id" ON "work_orders" ("manager_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "work_orders"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_type_enum"`);
    await queryRunner.query(`DROP TABLE "app_settings"`);
  }
}
