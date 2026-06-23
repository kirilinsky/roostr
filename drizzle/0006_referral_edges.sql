CREATE TABLE "referrals" (
	"referrer_id" bigint NOT NULL,
	"referee_id" bigint NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referee_id_pk" PRIMARY KEY("referee_id")
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "referrals" ("referrer_id", "referee_id", "registered_at")
SELECT "referred_by_id", "id", COALESCE("referred_at", "created_at")
FROM "users"
WHERE "referred_by_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE INDEX "referrals_referrer_id_idx" ON "referrals" USING btree ("referrer_id");
