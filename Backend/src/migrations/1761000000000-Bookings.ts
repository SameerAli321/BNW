import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bookings module: bookable rooms / pool tables, bookings (meetings, meeting rooms, pool table) and
 * meeting participants. Written by hand against src/entities/booking*.entity.ts, same approach as
 * every prior migration. Seeds two meeting rooms and one pool table so the module works straight
 * away — HR / Admin rename or add more under Bookings → Rooms & tables.
 */
export class Bookings1761000000000 implements MigrationInterface {
  name = 'Bookings1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."booking_resources_type_enum" AS ENUM ('MEETING_ROOM', 'POOL_TABLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_type_enum" AS ENUM ('MEETING', 'MEETING_ROOM', 'POOL_TABLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM ('CONFIRMED', 'CANCELLED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "booking_resources" (
        "id" SERIAL NOT NULL,
        "type" "public"."booking_resources_type_enum" NOT NULL,
        "name" character varying(100) NOT NULL,
        "location" character varying(200),
        "capacity" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_resources_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_booking_resources_capacity" CHECK ("capacity" IS NULL OR "capacity" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_booking_resources_type_name" ON "booking_resources" ("type", lower("name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_resources_type" ON "booking_resources" ("type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" SERIAL NOT NULL,
        "type" "public"."bookings_type_enum" NOT NULL,
        "title" character varying(200) NOT NULL,
        "purpose" character varying(300),
        "description" text,
        "resource_id" integer,
        "location" character varying(300),
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'CONFIRMED',
        "organizer_id" integer NOT NULL,
        "created_by_id" integer,
        "sequence" integer NOT NULL DEFAULT 0,
        "cancel_reason" text,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_by_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_bookings_time_range" CHECK ("end_at" > "start_at"),
        CONSTRAINT "CHK_bookings_resource_required" CHECK (
          "type" = 'MEETING' OR "resource_id" IS NOT NULL
        ),
        CONSTRAINT "FK_bookings_resource" FOREIGN KEY ("resource_id")
          REFERENCES "booking_resources"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bookings_organizer" FOREIGN KEY ("organizer_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bookings_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_bookings_cancelled_by" FOREIGN KEY ("cancelled_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_type" ON "bookings" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_status" ON "bookings" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_start_at" ON "bookings" ("start_at")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_resource_id" ON "bookings" ("resource_id", "start_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_organizer_id" ON "bookings" ("organizer_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "booking_participants" (
        "id" SERIAL NOT NULL,
        "booking_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_participants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_booking_participants_booking_user" UNIQUE ("booking_id", "user_id"),
        CONSTRAINT "FK_booking_participants_booking" FOREIGN KEY ("booking_id")
          REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_booking_participants_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_participants_user_id" ON "booking_participants" ("user_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "booking_resources" ("type", "name", "capacity") VALUES
        ('MEETING_ROOM', 'Meeting Room 1', 8),
        ('MEETING_ROOM', 'Meeting Room 2', 6),
        ('POOL_TABLE', 'Pool Table', NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "booking_participants"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "booking_resources"`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."bookings_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."booking_resources_type_enum"`);
  }
}
