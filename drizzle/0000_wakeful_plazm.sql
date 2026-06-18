CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attacker_user_id" bigint,
	"defender_user_id" bigint,
	"attacker_roostr_id" uuid,
	"defender_roostr_id" uuid,
	"winner_roostr_id" uuid,
	"log" jsonb,
	"coins_reward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breed_discoveries" (
	"user_id" bigint NOT NULL,
	"breed_id" text NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "breed_discoveries_user_id_breed_id_pk" PRIMARY KEY("user_id","breed_id")
);
--> statement-breakpoint
CREATE TABLE "expeditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" bigint NOT NULL,
	"roostr_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reward" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" bigint NOT NULL,
	"roostr_id" uuid,
	"plot" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"yield" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_a_id" bigint NOT NULL,
	"user_b_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_a_id_user_b_id_pk" PRIMARY KEY("user_a_id","user_b_id")
);
--> statement-breakpoint
CREATE TABLE "roostrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" bigint NOT NULL,
	"breed_id" text NOT NULL,
	"weight_class_id" text NOT NULL,
	"gene_ids" jsonb NOT NULL,
	"gene_levels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"colors" jsonb NOT NULL,
	"pattern" text NOT NULL,
	"role" text NOT NULL,
	"max_health" integer NOT NULL,
	"seed" integer NOT NULL,
	"nickname" text,
	"origin" text DEFAULT 'hatch' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"photo_url" text,
	"language_code" text,
	"coins" integer DEFAULT 0 NOT NULL,
	"feathers" integer DEFAULT 0 NOT NULL,
	"ton_address" text,
	"last_hatch_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_attacker_user_id_users_id_fk" FOREIGN KEY ("attacker_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_defender_user_id_users_id_fk" FOREIGN KEY ("defender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_attacker_roostr_id_roostrs_id_fk" FOREIGN KEY ("attacker_roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_defender_roostr_id_roostrs_id_fk" FOREIGN KEY ("defender_roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_roostr_id_roostrs_id_fk" FOREIGN KEY ("winner_roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breed_discoveries" ADD CONSTRAINT "breed_discoveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_roostr_id_roostrs_id_fk" FOREIGN KEY ("roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_sessions" ADD CONSTRAINT "farm_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_sessions" ADD CONSTRAINT "farm_sessions_roostr_id_roostrs_id_fk" FOREIGN KEY ("roostr_id") REFERENCES "public"."roostrs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roostrs" ADD CONSTRAINT "roostrs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;