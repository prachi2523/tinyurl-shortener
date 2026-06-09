-- Store shortened URLs
CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(15) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_custom BOOLEAN DEFAULT FALSE NOT NULL
);

-- Index for expiration cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;

-- Store access analytics
CREATE TABLE IF NOT EXISTS analytics (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(100)
);

-- Index for analytics retrieval
CREATE INDEX IF NOT EXISTS idx_analytics_url_id ON analytics(url_id);
CREATE INDEX IF NOT EXISTS idx_analytics_clicked_at ON analytics(clicked_at);
