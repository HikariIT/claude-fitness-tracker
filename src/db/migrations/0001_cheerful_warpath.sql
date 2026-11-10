CREATE TABLE "food_components" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "food_components_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"food_id" integer NOT NULL,
	"component_food_id" integer NOT NULL,
	"quantity_g" numeric(7, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_components_food_component_unique" UNIQUE("food_id","component_food_id"),
	CONSTRAINT "food_components_quantity_positive" CHECK ("food_components"."quantity_g" > 0),
	CONSTRAINT "food_components_not_self" CHECK ("food_components"."food_id" <> "food_components"."component_food_id")
);
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "is_composite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "final_weight_g" numeric(7, 1);--> statement-breakpoint
ALTER TABLE "food_components" ADD CONSTRAINT "food_components_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_components" ADD CONSTRAINT "food_components_component_food_id_foods_id_fk" FOREIGN KEY ("component_food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_components_component_food_id_idx" ON "food_components" USING btree ("component_food_id");--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_final_weight_positive" CHECK ("foods"."final_weight_g" IS NULL OR "foods"."final_weight_g" > 0);