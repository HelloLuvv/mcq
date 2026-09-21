import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { practiceQuestions, mockTests } from '../data'
import { supabase } from '../lib/supabaseClient'
import ThemeToggle from '../components/ThemeToggle'

const NEGATIVE_MARK = -0.25
const CORRECT_MARK = 1
const AUTO_SAVE_INTERVAL = 5000

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
  const [resuming, setResuming] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const lastSavedTimeRef = useRef(timeLeft)
  const lastSavedAnswersRef = useRef(answers)
  const lastSavedPointerRef = useRef(pointer)
  const testStartTimeRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

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

  const loadSession = useCallback(async (user) => {
    if (!user || !test) return null

    try {
      const { data: sessions, error } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('supabase_user_id', user.id)
        .eq('test_id', test.id)
        .eq('completed', false)
        .order('last_updated', { ascending: false })
        .limit(1)

      if (error) throw error

      if (sessions && sessions.length > 0) {
        const session = sessions[0]
        const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
        const calculatedTimeLeft = Math.max(0, session.duration - elapsed)

        if (calculatedTimeLeft <= 0) {
          await supabase
            .from('test_sessions')
            .update({ completed: true, submitted_at: new Date().toISOString() })
            .eq('id', session.id)
          return null
        }

        return {
          ...session,
          timeLeft: calculatedTimeLeft,
          elapsed
        }
      }
      return null
    } catch (e) {
      console.error('Failed to load session:', e.message)
      return null
    }
  }, [test])

  const createSession = useCallback(async (user, initialQuestions, initialOrder, initialTimeLeft) => {
    if (!user || !test) return null

    try {
      const { data, error } = await supabase
        .from('test_sessions')
        .insert({
          supabase_user_id: user.id,
          test_id: test.id,
          test_title: test.title,
          questions: initialQuestions,
          question_order: initialOrder,
          answers: {},
          current_index: 0,
          time_left: initialTimeLeft,
          duration: test.duration * 60,
          started_at: new Date().toISOString(),
          completed: false
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      console.error('Failed to create session:', e.message)
      return null
    }
  }, [test])

  const saveSession = useCallback(async (updates) => {
    if (!sessionId || !isMountedRef.current) return

    try {
      const { error } = await supabase
        .from('test_sessions')
        .update(updates)
        .eq('id', sessionId)

      if (error) throw error
    } catch (e) {
      console.error('Failed to save session:', e.message)
    }
  }, [sessionId])

  const autoSave = useCallback(() => {
    if (!sessionId || !started || submitted || !test) return

    const hasChanges =
      JSON.stringify(answers) !== JSON.stringify(lastSavedAnswersRef.current) ||
      pointer !== lastSavedPointerRef.current ||
      Math.abs(timeLeft - lastSavedTimeRef.current) > 1

    if (hasChanges) {
      lastSavedAnswersRef.current = answers
      lastSavedPointerRef.current = pointer
      lastSavedTimeRef.current = timeLeft

      saveSession({
        answers,
        current_index: pointer,
        time_left: timeLeft,
        questions,
        question_order: order
      })
    }
  }, [sessionId, started, submitted, test, answers, pointer, timeLeft, questions, order, saveSession])

  useEffect(() => {
    if (!started || submitted) return
    autoSaveRef.current = setInterval(autoSave, AUTO_SAVE_INTERVAL)
    return () => clearInterval(autoSaveRef.current)
  }, [started, submitted, autoSave])

  useEffect(() => {
    if (!test || started) return

    const examQuestions = practiceQuestions.filter(q => q.exam === test.exam)
    const shuffled = [...examQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, test.questions)
    const questionOrder = selected.map(q => q.id)

    setQuestions(selected)
    setOrder(questionOrder)
  }, [test, started])

  const handleStart = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setResuming(true)

    const existingSession = await loadSession(user)

    if (existingSession) {
      setQuestions(existingSession.questions)
      setOrder(existingSession.question_order)
      setAnswers(existingSession.answers)
      setPointer(existingSession.current_index)
      setTimeLeft(existingSession.timeLeft)
      setSessionId(existingSession.id)
      testStartTimeRef.current = new Date(existingSession.started_at).getTime()
      lastSavedTimeRef.current = existingSession.timeLeft
      lastSavedAnswersRef.current = existingSession.answers
      lastSavedPointerRef.current = existingSession.current_index
    } else {
      const examQuestions = practiceQuestions.filter(q => q.exam === test.exam)
      const shuffled = [...examQuestions].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, test.questions)
      const questionOrder = selected.map(q => q.id)
      const initialTimeLeft = test.duration * 60

      setQuestions(selected)
      setOrder(questionOrder)
      setTimeLeft(initialTimeLeft)

      const session = await createSession(user, selected, questionOrder, initialTimeLeft)
      if (session) {
        setSessionId(session.id)
        testStartTimeRef.current = Date.now()
        lastSavedTimeRef.current = initialTimeLeft
      }
    }

    setStarted(true)
    setResuming(false)
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = useCallback(async () => {
    if (submitted) return

    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)

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
        await Promise.all([
          supabase.from('mock_test_results').insert({
            supabase_user_id: user.id,
            test_id: test.id,
            test_title: test.title,
            score: result.score,
            correct: result.correct,
            wrong: result.wrong,
            unattempted: result.unattempted,
            percentage: result.percentage,
            created_at: new Date().toISOString(),
          }),
          sessionId && supabase
            .from('test_sessions')
            .update({
              completed: true,
              submitted_at: new Date().toISOString(),
              answers,
              current_index: pointer,
              time_left: timeLeft
            })
            .eq('id', sessionId)
        ])
      }
    } catch (e) {
      console.error('Failed to save mock test result:', e.message)
    }

    setResults(result)
  }, [submitted, questions, answers, test, sessionId, pointer, timeLeft])

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return

    if (!testStartTimeRef.current) {
      testStartTimeRef.current = Date.now()
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [started, submitted, timeLeft, handleSubmit])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="page-shell"><p className="loading-text">Loading...</p></div>
  if (!test) return <div className="page-shell"><p className="error-text">Test not found</p></div>

  const currentQuestion = questions.find(q => q.id === order[pointer])

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mock Test</p>
          <h1>{test.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={`timer ${timeLeft < 300 ? 'warning' : ''} ${timeLeft <= 0 ? 'expired' : ''}`}>
            {formatTime(timeLeft)}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {!started && !resuming && (
        <section className="section">
          <div className="info-card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2>Test Instructions</h2>
            <ul style={{ lineHeight: 1.8 }}>
              <li><strong>Duration:</strong> {test.duration} minutes</li>
              <li><strong>Total Questions:</strong> {test.questions}</li>
              <li><strong>Marking Scheme:</strong> +{CORRECT_MARK} for correct, {NEGATIVE_MARK} for incorrect, 0 for unattempted</li>
              <li><strong>Negative Marking:</strong> Yes ({Math.abs(NEGATIVE_MARK * 100)}% deduction per wrong answer)</li>
              <li>You can navigate between questions using Previous/Next buttons or the question palette</li>
              <li>You can submit the test at any time</li>
              <li>Timer will auto-submit when time runs out</li>
              <li>Progress is saved automatically — you can resume later if needed</li>
            </ul>
            <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={handleStart}>
              {resuming ? 'Resuming...' : 'Start Test'}
            </button>
          </div>
        </section>
      )}

      {resuming && (
        <section className="section">
          <div className="info-card" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p>Resuming your test session...</p>
          </div>
        </section>
      )}

      {started && !submitted && currentQuestion && (
        <section className="section">
          <div className="panel test-panel">
            <div className="question-header">
              <div className="question-meta">
                <p className="question-topic">Question {pointer + 1} of {questions.length}</p>
                <h2 className="question-text">{currentQuestion.question}</h2>
              </div>
              <div className="question-palette" role="navigation" aria-label="Question navigation">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={`question-nav-btn ${pointer === idx ? 'active' : ''} ${answers[q.id] ? 'answered' : ''} ${pointer === idx ? 'current' : ''}`}
                    onClick={() => setPointer(idx)}
                    aria-label={`Question ${idx + 1}${answers[q.id] ? ' (answered)' : ''}${pointer === idx ? ' (current)' : ''}`}
                    aria-current={pointer === idx ? 'true' : 'false'}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="options-container">
              <fieldset className="options-fieldset">
                <legend className="visually-hidden">Answer Options</legend>
                <div className="option-list">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option}
                      className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                    >
                      <span className="option-label">{option}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="action-row">
              <button
                className="btn btn-secondary"
                onClick={() => setPointer(p => Math.max(0, p - 1))}
                disabled={pointer === 0}
                aria-label="Previous question"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setPointer(p => Math.min(questions.length - 1, p + 1))}
                disabled={pointer === questions.length - 1}
                aria-label="Next question"
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 6 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <button className="btn btn-danger" onClick={handleSubmit} aria-label="Submit test">
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
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
                setSessionId(null)
                testStartTimeRef.current = null
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