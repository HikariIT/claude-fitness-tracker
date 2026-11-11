CREATE TABLE "daily_steps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_steps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"steps" integer NOT NULL,
	"kcal" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_steps_date_unique" UNIQUE("date"),
	CONSTRAINT "daily_steps_steps_non_negative" CHECK ("daily_steps"."steps" >= 0),
	CONSTRAINT "daily_steps_kcal_non_negative" CHECK ("daily_steps"."kcal" >= 0)
);
--> statement-breakpoint
ALTER TABLE "treadmill_sessions" DROP COLUMN "distance_km";