CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roostr_id" uuid NOT NULL,
	"seller_id" bigint NOT NULL,
	"price" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"buyer_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "coin_txns" RENAME TO "resource_txns";--> statement-breakpoint
ALTER TABLE "resource_txns" DROP CONSTRAINT "coin_txns_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_txns" ADD COLUMN "resource" text;--> statement-breakpoint
UPDATE "resource_txns" SET "resource" = 'coin';--> statement-breakpoint
ALTER TABLE "resource_txns" ALTER COLUMN "resource" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roostr_transfers" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sci" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_roostr_id_roostrs_id_fk" FOREIGN KEY ("roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_txns" ADD CONSTRAINT "resource_txns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;