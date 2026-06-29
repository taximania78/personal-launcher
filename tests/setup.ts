import { config } from 'dotenv'
config({ path: '.env.local' })

// CRITICAL: redirect the queries' pg.Pool singletons at the test DB BEFORE
// any module that imports `@/lib/db` is loaded. Since env.ts reads
// process.env at module load, mutating env vars here only works if vitest
// loads this setupFile before importing the test files (it does).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DATABASE_URL_READ = process.env.TEST_DATABASE_URL
}
