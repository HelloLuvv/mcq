import fs from 'fs'

function parseEnv(path) {
  const text = fs.readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/)
  const out = {}
  for (const l of lines) {
    const m = l.match(/^([^=#]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

const env = parseEnv('./.env')
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(2)
}

const target = `${url}/auth/v1/health`

console.log('Checking reachability to Supabase project...')

fetch(target, {
  method: 'GET',
  headers: {
    apiKey: anon,
    Authorization: `Bearer ${anon}`,
  },
})
  .then((res) => {
    console.log('Status:', res.status)
    return res.text()
  })
  .then((body) => {
    console.log('Response:', body)
    console.log('Response length:', body.length)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error reaching Supabase:', err.message)
    process.exit(1)
  })
