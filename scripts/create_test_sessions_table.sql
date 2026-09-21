-- Test Sessions Table for Resume/Progress Tracking
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id uuid NOT NULL,
  test_id text NOT NULL,
  test_title text NOT NULL,
  questions jsonb NOT NULL,          -- Full question objects in order
  question_order integer[] NOT NULL, -- Array of question IDs in display order
  answers jsonb NOT NULL DEFAULT '{}', -- {questionId: selectedAnswer}
  current_index integer NOT NULL DEFAULT 0,
  time_left integer NOT NULL,        -- Remaining seconds
  duration integer NOT NULL,         -- Original duration in seconds
  started_at timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  -- RLS: Users can only access their own sessions
  CONSTRAINT unique_active_session UNIQUE (supabase_user_id, test_id, completed)
    WHERE (completed = false)
);

-- Enable Row Level Security
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own test sessions" ON test_sessions
  FOR SELECT USING (auth.uid() = supabase_user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own test sessions" ON test_sessions
  FOR INSERT WITH CHECK (auth.uid() = supabase_user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own test sessions" ON test_sessions
  FOR UPDATE USING (auth.uid() = supabase_user_id);

-- Policy: Users can delete their own sessions (optional)
CREATE POLICY "Users can delete own test sessions" ON test_sessions
  FOR DELETE USING (auth.uid() = supabase_user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_test ON test_sessions(supabase_user_id, test_id, completed);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_active ON test_sessions(supabase_user_id, completed) WHERE (completed = false);

-- Function to update last_updated timestamp automatically
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_updated
DROP TRIGGER IF EXISTS trigger_update_last_updated ON test_sessions;
CREATE TRIGGER trigger_update_last_updated
  BEFORE UPDATE ON test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();