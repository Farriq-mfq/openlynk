-- Single-admin model: users -> admins (+ name, status), user_id -> admin_id.
-- Backfills name for pre-existing rows (fresh installs have none); the
-- temporary DEFAULT is dropped so the seeder must always supply a name.
ALTER TABLE "users" RENAME TO "admins";--> statement-breakpoint
ALTER TABLE "admins" RENAME CONSTRAINT "users_pkey" TO "admins_pkey";--> statement-breakpoint
ALTER TABLE "admins" RENAME CONSTRAINT "users_email_unique" TO "admins_email_unique";--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "name" varchar(80) NOT NULL DEFAULT 'Admin';--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "status" varchar(16) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "user_id" TO "admin_id";--> statement-breakpoint
ALTER TABLE "profiles" RENAME CONSTRAINT "profiles_user_id_unique" TO "profiles_admin_id_unique";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER INDEX "profiles_user_id_idx" RENAME TO "profiles_admin_id_idx";--> statement-breakpoint
ALTER TABLE "refresh_tokens" RENAME COLUMN "user_id" TO "admin_id";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER INDEX "refresh_tokens_user_idx" RENAME TO "refresh_tokens_admin_idx";