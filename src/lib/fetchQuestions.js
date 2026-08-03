function decodeHtmlEntities(str) {
  if (typeof document === 'undefined') return str
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// OpenTDB category ids, restricted to ones that are subject-relevant to each exam.
// OpenTDB has no India-specific content, so UPSC/SSC/Banking/Railway are best-effort
// (general knowledge/politics/history/geography) rather than true exam-syllabus matches.
const EXAM_CATEGORIES = {
  GATE: [18, 19, 17], // Science: Computers, Mathematics, Science & Nature
  JEE: [17, 19, 18], // Science & Nature, Mathematics, Computers
  NEET: [17], // Science & Nature (biology/chemistry/physics)
  UPSC: [24, 23, 22, 9], // Politics, History, Geography, General Knowledge
  SSC: [9, 19, 24], // General Knowledge, Mathematics, Politics
  Banking: [9, 19], // General Knowledge, Mathematics
  Railway: [9, 22], // General Knowledge, Geography
}

function pickCategory(exam) {
  const options = EXAM_CATEGORIES[exam]
  if (!options || options.length === 0) return null
  return options[Math.floor(Math.random() * options.length)]
}

export async function fetchQuestionsFromOpenTDB({ amount = 10, exam = 'General' } = {}) {
  const category = pickCategory(exam)
  const params = new URLSearchParams({ amount: String(amount), type: 'multiple' })
  if (category) params.set('category', String(category))
  const url = `https://opentdb.com/api.php?${params.toString()}`
  const res = await fetch(url)
  const json = await res.json()
  if (!json.results) return []

  return json.results.map((r, idx) => {
    const correct = decodeHtmlEntities(r.correct_answer)
    const incorrect = r.incorrect_answers.map((s) => decodeHtmlEntities(s))
    const options = shuffle([correct, ...incorrect])
    return {
      id: Date.now() + '_' + idx,
      topic: r.category,
      exam,
      question: decodeHtmlEntities(r.question),
      options,
      answer: correct,
      explanation: '',
    }
  })
}

export default fetchQuestionsFromOpenTDB
