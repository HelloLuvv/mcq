import fs from 'fs'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { practiceQuestions, mockTests } from '../src/data.js'

dotenv.config({ path: './.env' })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set in .env')
  process.exit(2)
}

const client = new Client({ connectionString })

async function run() {
  await client.connect()

  console.log('Connected to database, creating tables...')

  await client.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id integer PRIMARY KEY,
      topic text,
      exam text,
      question text,
      options jsonb,
      answer text,
      explanation text
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      email text UNIQUE,
      role text DEFAULT 'student',
      supabase_id uuid
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS mock_tests (
      id integer PRIMARY KEY,
      title text,
      duration text,
      questions integer,
      level text
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id serial PRIMARY KEY,
      supabase_user_id uuid,
      question_id integer,
      correct boolean,
      time_spent integer,
      ef real,
      interval integer,
      repetition integer,
      next_review timestamptz,
      created_at timestamptz DEFAULT now()
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id serial PRIMARY KEY,
      supabase_user_id uuid,
      question_id integer,
      created_at timestamptz DEFAULT now()
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS mock_test_results (
      id serial PRIMARY KEY,
      supabase_user_id uuid,
      test_id text,
      test_title text,
      score real,
      correct integer,
      wrong integer,
      unattempted integer,
      percentage text,
      created_at timestamptz DEFAULT now()
    )
  `)

  // insert questions
  for (const q of practiceQuestions) {
    const res = await client.query(
      `INSERT INTO questions (id, topic, exam, question, options, answer, explanation)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET topic=EXCLUDED.topic, exam=EXCLUDED.exam, question=EXCLUDED.question, options=EXCLUDED.options, answer=EXCLUDED.answer, explanation=EXCLUDED.explanation`,
      [q.id, q.topic, q.exam || null, q.question, JSON.stringify(q.options), q.answer, q.explanation],
    )
  }

  for (const t of mockTests) {
    await client.query(
      `INSERT INTO mock_tests (id, title, duration, questions, level)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, duration=EXCLUDED.duration, questions=EXCLUDED.questions, level=EXCLUDED.level`,
      [t.id, t.title, t.duration, t.questions, t.level],
    )
  }

  // ensure admin user exists (email from .env)
  const adminEmail = process.env.VITE_ADMIN_EMAIL
  if (adminEmail) {
    await client.query(
      `INSERT INTO users (email, role) VALUES ($1, 'admin') ON CONFLICT (email) DO UPDATE SET role='admin'`,
      [adminEmail],
    )
    console.log('Admin user ensured:', adminEmail)
  }

  console.log('Seeding complete.')
  await client.end()
}

run().catch((err) => {
  console.error('Error seeding database:', err.message)
  process.exit(1)
})
