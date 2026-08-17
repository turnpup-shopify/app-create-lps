CREATE TABLE IF NOT EXISTS "outlines" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "brief" jsonb NOT NULL,
  "headings" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
