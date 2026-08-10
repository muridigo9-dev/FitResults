-- Tabela para tracking de hábitos no check-in diário
CREATE TABLE IF NOT EXISTS checkin_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    habit_name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'target',
    color TEXT NOT NULL DEFAULT '#6366f1',
    unit TEXT NOT NULL DEFAULT '',
    goal INTEGER NOT NULL DEFAULT 1,
    current INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(checkin_id, habit_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checkin_habits_checkin_id ON checkin_habits(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_habits_habit_id ON checkin_habits(habit_id);

-- RLS
ALTER TABLE checkin_habits ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver seus próprios registros
CREATE POLICY "Users can view own checkin habits"
    ON checkin_habits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM daily_checkins dc 
            WHERE dc.id = checkin_habits.checkin_id 
            AND dc.user_id = auth.uid()
        )
    );

-- Policy: usuários podem inserir seus próprios registros
CREATE POLICY "Users can insert own checkin habits"
    ON checkin_habits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM daily_checkins dc 
            WHERE dc.id = checkin_habits.checkin_id 
            AND dc.user_id = auth.uid()
        )
    );

-- Policy: usuários podem atualizar seus próprios registros
CREATE POLICY "Users can update own checkin habits"
    ON checkin_habits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM daily_checkins dc 
            WHERE dc.id = checkin_habits.checkin_id 
            AND dc.user_id = auth.uid()
        )
    );

-- Policy: usuários podem deletar seus próprios registros
CREATE POLICY "Users can delete own checkin habits"
    ON checkin_habits FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM daily_checkins dc 
            WHERE dc.id = checkin_habits.checkin_id 
            AND dc.user_id = auth.uid()
        )
    );
