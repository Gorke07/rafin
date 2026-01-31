import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[rafin] DATABASE_URL is not set')
  process.exit(1)
}

const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?.*)?$/)
if (!match) {
  console.error('[rafin] Invalid DATABASE_URL format')
  process.exit(1)
}

const [, dbUser, dbPass, dbHost, dbPort, dbName] = match
const adminUrl = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/postgres`

const maxRetries = 30
let retry = 0

console.log(`[rafin] Waiting for PostgreSQL at ${dbHost}:${dbPort}...`)

while (retry < maxRetries) {
  try {
    const sql = postgres(adminUrl, { connect_timeout: 5 })
    await sql`SELECT 1`
    await sql.end()
    console.log('[rafin] PostgreSQL is ready')
    break
  } catch {
    retry++
    console.log(`[rafin] PostgreSQL not ready, retrying (${retry}/${maxRetries})...`)
    await new Promise((r) => setTimeout(r, 2000))
  }
}

if (retry >= maxRetries) {
  console.error('[rafin] ERROR: Could not connect to PostgreSQL')
  process.exit(1)
}

console.log(`[rafin] Ensuring database '${dbName}' exists...`)

const admin = postgres(adminUrl)
try {
  const rows = await admin.unsafe(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`)
  if (rows.length === 0) {
    console.log(`[rafin] Creating database ${dbName}...`)
    await admin.unsafe(`CREATE DATABASE "${dbName}"`)
    console.log('[rafin] Database created')
  } else {
    console.log(`[rafin] Database ${dbName} already exists`)
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[rafin] Database creation failed:', message)
  await admin.end()
  process.exit(1)
}
await admin.end()

console.log('[rafin] Running migrations...')
const migrationClient = postgres(url, { max: 1 })
const db = drizzle(migrationClient)
try {
  await migrate(db, { migrationsFolder: '/app/packages/db/drizzle' })
  console.log('[rafin] Migrations complete')
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[rafin] Migration failed:', message)
  await migrationClient.end()
  process.exit(1)
}
await migrationClient.end()
