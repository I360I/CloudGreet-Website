-- Usage ledger for subscriptions and per-booking fees
CREATE TABLE IF NOT EXISTS billing_usage_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('subscription', 'booking_fee', 'credit_adjustment')),
    stripe_invoice_id TEXT,
    stripe_subscription_id TEXT,
    stripe_charge_id TEXT,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    description TEXT,
    service_period_start TIMESTAMP WITH TIME ZONE,
    service_period_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, stripe_invoice_id, stripe_charge_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_usage_ledger_tenant ON billing_usage_ledger (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_usage_ledger_invoice ON billing_usage_ledger (stripe_invoice_id);

-- Billing alerts for failed invoices and anomalies
CREATE TABLE IF NOT EXISTS billing_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id TEXT,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('invoice_failed', 'payment_action_required', 'threshold_exceeded')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, invoice_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_billing_alerts_tenant ON billing_alerts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_open ON billing_alerts (tenant_id, resolved_at) WHERE resolved_at IS NULL;

-- Dunning workflow tracking
CREATE TABLE IF NOT EXISTS billing_dunning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    payload JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_dunning_unique_step ON billing_dunning_events (tenant_id, invoice_id, step, channel);


