import 'dotenv/config'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

async function reset() {
  const sql = postgres(connectionString)

  console.log('Dropping all tables...')

  // Get all table names in public schema
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  `

  // Drop all tables
  for (const { tablename } of tables) {
    console.log(`  Dropping ${tablename}...`)
    await sql.unsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE`)
  }

  console.log('All tables dropped.')
  await sql.end()

  // Run drizzle-kit push to recreate schema
  console.log('\nRecreating schema with drizzle-kit push...')
  const proc = Bun.spawn(['bunx', 'drizzle-kit', 'push', '--force'], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  await proc.exited

  console.log('\nDatabase reset complete!')
}

reset().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
