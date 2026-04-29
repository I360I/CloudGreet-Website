-- Integration credential storage
CREATE TABLE IF NOT EXISTS integration_secret_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value_encrypted TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (slug, field_key)
);

COMMENT ON TABLE integration_secret_values IS 'Stores encrypted integration credentials managed from the owner settings UI.';
COMMENT ON COLUMN integration_secret_values.slug IS 'Integration identifier (e.g. stripe, telnyx, retell).';
COMMENT ON COLUMN integration_secret_values.field_key IS 'Specific field within the integration (e.g. stripe_secret_key).';
COMMENT ON COLUMN integration_secret_values.value_encrypted IS 'AES-256-GCM encrypted secret value.';
COMMENT ON COLUMN integration_secret_values.status IS 'Connection status (connected, pending, error).';
COMMENT ON COLUMN integration_secret_values.metadata IS 'JSON metadata such as validation errors.';

CREATE INDEX IF NOT EXISTS idx_integration_secret_values_slug ON integration_secret_values (slug);
CREATE INDEX IF NOT EXISTS idx_integration_secret_values_status ON integration_secret_values (status);


