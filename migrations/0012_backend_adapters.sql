ALTER TABLE "projects" ADD COLUMN "backend_type" text;
ALTER TABLE "projects" ADD COLUMN "backend_project_id" text;

UPDATE "projects"
SET "backend_type" = 'neon',
    "backend_project_id" = "neon_project_id"
WHERE "backend_type" IS NULL;

ALTER TABLE "projects" ALTER COLUMN "backend_type" SET NOT NULL;
ALTER TABLE "projects" DROP COLUMN "neon_project_id";
