CREATE TABLE "food_portions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "food_portions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"food_id" integer NOT NULL,
	"name" text NOT NULL,
	"grams" numeric(7, 1) NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_portions_grams_positive" CHECK ("food_portions"."grams" > 0)
);
--> statement-breakpoint
ALTER TABLE "food_components" ADD COLUMN "portion_name" text;--> statement-breakpoint
ALTER TABLE "food_components" ADD COLUMN "portion_g" numeric(7, 1);--> statement-breakpoint
ALTER TABLE "food_components" ADD COLUMN "portion_count" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "portion_name" text;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "portion_g" numeric(7, 1);--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "portion_count" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_portions_food_name_unique" ON "food_portions" USING btree ("food_id",lower("name"));--> statement-breakpoint
ALTER TABLE "food_components" ADD CONSTRAINT "food_components_portion_all_or_none" CHECK (("food_components"."portion_name" IS NULL AND "food_components"."portion_g" IS NULL AND "food_components"."portion_count" IS NULL) OR ("food_components"."portion_name" IS NOT NULL AND "food_components"."portion_g" IS NOT NULL AND "food_components"."portion_count" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_portion_all_or_none" CHECK (("diary_entries"."portion_name" IS NULL AND "diary_entries"."portion_g" IS NULL AND "diary_entries"."portion_count" IS NULL) OR ("diary_entries"."portion_name" IS NOT NULL AND "diary_entries"."portion_g" IS NOT NULL AND "diary_entries"."portion_count" IS NOT NULL));