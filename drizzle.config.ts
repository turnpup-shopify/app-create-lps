import { defineConfig } from 'drizzle-kit'
import { findDatabaseUrl } from './lib/db/url'

// The same four names the app reads, because the error message that sends a
// reader here names this command, and reading only DATABASE_URL would fail on
// the Vercel and Supabase deployments that set POSTGRES_URL instead.
const found = findDatabaseUrl()

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: found?.url ?? '',
  },
})
