CREATE TABLE "reading_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"target_books" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reading_goal_user_year" UNIQUE("user_id","year")
);
--> statement-breakpoint
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;