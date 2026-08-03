// Simple SM-2 spaced repetition implementation
export function nextSRS(prev = null, correct = true) {
  // quality score: 5 for correct, 2 for incorrect
  const q = correct ? 5 : 2

  if (!prev) {
    // initial values
    const ef = 2.5
    const repetition = correct ? 1 : 0
    const interval = correct ? 1 : 0
    const next_review = correct ? addDays(new Date(), interval) : null
    return { ef, repetition, interval, next_review }
  }

  let ef = prev.ef || 2.5
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ef < 1.3) ef = 1.3

  let repetition = prev.repetition || 0
  let interval = prev.interval || 0

  if (q < 3) {
    repetition = 0
    interval = 0
  } else {
    repetition = repetition + 1
    if (repetition === 1) interval = 1
    else if (repetition === 2) interval = 6
    else interval = Math.round(interval * ef)
  }

  const next_review = repetition > 0 ? addDays(new Date(), interval) : null
  return { ef, repetition, interval, next_review }
}

function addDays(date, days) {
  if (!days || days <= 0) return null
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default nextSRS
