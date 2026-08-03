import dotenv from 'dotenv'
import { Client } from 'pg'

dotenv.config({ path: './.env' })
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL missing in .env')
  process.exit(2)
}

const client = new Client({ connectionString })

async function run() {
  await client.connect()
  console.log('Connected to DB — syncing auth.users into public.users')

  // auth.users is available when connected as postgres
  const res = await client.query(`SELECT id, email FROM auth.users`)
  for (const row of res.rows) {
    await client.query(
      `INSERT INTO users (email, supabase_id, role) VALUES ($1,$2,'student') ON CONFLICT (email) DO UPDATE SET supabase_id=EXCLUDED.supabase_id`,
      [row.email, row.id],
    )
  }

  console.log('Sync complete. Users upserted:', res.rows.length)
  await client.end()
}

run().catch((err) => {
  console.error('Sync error:', err.message)
  process.exit(1)
})
