-- Outreach automation tables build on top of the prospecting base schema.

-- Extend outreach_sequences with richer operational metadata.
ALTER TABLE outreach_sequences
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES custom_users(id),
    ADD COLUMN IF NOT EXISTS throttle_per_day INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS send_window_start TIME WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS send_window_end TIME WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS auto_pause_on_reply BOOLEAN DEFAULT TRUE;

ALTER TABLE outreach_sequences
    ALTER COLUMN config SET DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_business ON outreach_sequences (business_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status ON outreach_sequences (status);

-- Templates (Email/SMS) managed per-business.
CREATE TABLE IF NOT EXISTS outreach_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id),
    created_by UUID REFERENCES custom_users(id),
    name TEXT NOT NULL,
    channel TEXT NOT NULL, -- email | sms
    subject TEXT,
    body TEXT NOT NULL,
    compliance_footer TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_templates_business ON outreach_templates (business_id);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_channel ON outreach_templates (channel);

-- Sequence steps executed in order with wait times and fallback channels.
CREATE TABLE IF NOT EXISTS outreach_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    channel TEXT NOT NULL, -- email | sms | call
    wait_minutes INTEGER NOT NULL DEFAULT 0,
    template_id UUID REFERENCES outreach_templates(id),
    fallback_channel TEXT,
    send_window_start TIME WITHOUT TIME ZONE,
    send_window_end TIME WITHOUT TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_outreach_steps_sequence ON outreach_steps (sequence_id);

-- Track every outbound attempt and engagement signal.
CREATE TABLE IF NOT EXISTS outreach_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    step_id UUID REFERENCES outreach_steps(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL, -- scheduled | sending | sent | delivered | bounced | replied | failed
    message_id TEXT,
    error TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_sequence ON outreach_events (sequence_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_prospect ON outreach_events (prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_channel_status ON outreach_events (channel, status);

-- Update prospects with sequence tracking information.
ALTER TABLE prospects
    ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES outreach_sequences(id),
    ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sequence_status TEXT DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS next_touch_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_prospects_sequence_id ON prospects (sequence_id);
CREATE INDEX IF NOT EXISTS idx_prospects_sequence_status ON prospects (sequence_status);


