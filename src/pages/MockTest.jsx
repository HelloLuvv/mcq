import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { practiceQuestions, mockTests } from '../data'
import { supabase } from '../lib/supabaseClient'
import ThemeToggle from '../components/ThemeToggle'

const NEGATIVE_MARK = -0.25
const CORRECT_MARK = 1

function MockTest() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [order, setOrder] = useState([])
  const [pointer, setPointer] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [started, setStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const found = mockTests.find(t => t.id === testId)
    if (!found) {
      navigate('/student')
      return
    }
    setTest(found)
    setTimeLeft(found.duration * 60)
    setLoading(false)
  }, [testId, navigate])

  useEffect(() => {
    if (!test || started) return
    const examQuestions = practiceQuestions.filter(q => q.exam === test.exam)
    const shuffled = [...examQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, test.questions)
    setQuestions(selected)
    setOrder(selected.map(q => q.id))
  }, [test])

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [started, submitted, timeLeft])

  const handleStart = () => {
    setStarted(true)
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    clearInterval()

    const correctCount = questions.filter(q => answers[q.id] === q.answer).length
    const wrongCount = questions.filter(q => answers[q.id] && answers[q.id] !== q.answer).length
    const unattempted = questions.filter(q => !answers[q.id]).length
    const score = correctCount * CORRECT_MARK + wrongCount * NEGATIVE_MARK

    const result = {
      correct: correctCount,
      wrong: wrongCount,
      unattempted,
      score: Math.max(0, score),
      total: questions.length,
      maxScore: questions.length,
      percentage: ((score / questions.length) * 100).toFixed(1),
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('mock_test_results').insert({
          supabase_user_id: user.id,
          test_id: test.id,
          test_title: test.title,
          score: result.score,
          correct: result.correct,
          wrong: result.wrong,
          unattempted: result.unattempted,
          percentage: result.percentage,
          created_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('Failed to save mock test result:', e.message)
    }

    setResults(result)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="page-shell"><p>Loading...</p></div>
  if (!test) return <div className="page-shell"><p>Test not found</p></div>

  const currentQuestion = questions.find(q => q.id === order[pointer])

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mock Test</p>
          <h1>{test.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {!started && (
        <section className="section">
          <div className="info-card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2>Test Instructions</h2>
            <ul style={{ lineHeight: 1.8 }}>
              <li><strong>Duration:</strong> {test.duration} minutes</li>
              <li><strong>Total Questions:</strong> {test.questions}</li>
              <li><strong>Marking Scheme:</strong> +{CORRECT_MARK} for correct, {NEGATIVE_MARK} for incorrect, 0 for unattempted</li>
              <li><strong>Negative Marking:</strong> Yes ({Math.abs(NEGATIVE_MARK * 100)}% deduction per wrong answer)</li>
              <li>You can navigate between questions using Previous/Next buttons</li>
              <li>You can submit the test at any time</li>
              <li>Timer will auto-submit when time runs out</li>
            </ul>
            <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={handleStart}>
              Start Test
            </button>
          </div>
        </section>
      )}

      {started && !submitted && currentQuestion && (
        <section className="section">
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p className="question-topic">Question {pointer + 1} of {questions.length}</p>
                <h3>{currentQuestion.question}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={`question-nav-btn ${pointer === idx ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
                    onClick={() => setPointer(idx)}
                    style={{ width: 32, height: 32, fontSize: 12 }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-list">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="action-row" style={{ marginTop: 20 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPointer(p => Math.max(0, p - 1))}
                disabled={pointer === 0}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setPointer(p => Math.min(questions.length - 1, p + 1))}
                disabled={pointer === questions.length - 1}
              >
                Next
              </button>
              <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={handleSubmit}>
                Submit Test
              </button>
            </div>
          </div>
        </section>
      )}

      {submitted && results && (
        <section className="section">
          <div className="panel">
            <h2>Test Results</h2>
            <div className="stats-row" style={{ marginBottom: 24 }}>
              <div className="stat-card success">
                <strong>{results.correct}</strong>
                <span>Correct</span>
              </div>
              <div className="stat-card danger">
                <strong>{results.wrong}</strong>
                <span>Wrong</span>
              </div>
              <div className="stat-card warning">
                <strong>{results.unattempted}</strong>
                <span>Unattempted</span>
              </div>
              <div className="stat-card">
                <strong>{results.score}/{results.maxScore}</strong>
                <span>Score</span>
              </div>
              <div className="stat-card">
                <strong>{results.percentage}%</strong>
                <span>Percentage</span>
              </div>
            </div>

            <h3>Question Review</h3>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id]
                const isCorrect = userAnswer === q.answer
                const isWrong = userAnswer && !isCorrect
                return (
                  <div key={q.id} className="list-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span><strong>Q{idx + 1}.</strong> {q.question}</span>
                      <span className={isCorrect ? 'correct-badge' : isWrong ? 'wrong-badge' : 'unattempted-badge'}>
                        {isCorrect ? '✓ Correct' : isWrong ? '✗ Wrong' : '○ Unattempted'}
                      </span>
                    </div>
                    <p style={{ marginBottom: 4 }}>
                      <strong>Your answer:</strong> {userAnswer || 'Not answered'}
                    </p>
                    <p style={{ marginBottom: 4 }}>
                      <strong>Correct answer:</strong> {q.answer}
                    </p>
                    {q.explanation && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="action-row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => navigate('/student')}>
                Back to Portal
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setStarted(false)
                setSubmitted(false)
                setAnswers({})
                setPointer(0)
                setResults(null)
                setTimeLeft(test.duration * 60)
              }}>
                Retry Test
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default MockTest