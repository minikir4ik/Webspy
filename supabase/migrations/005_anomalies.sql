-- Anomaly detection table
CREATE TABLE IF NOT EXISTS anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('price_spike', 'price_crash', 'unusual_stock_change')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  description text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own anomalies"
  ON anomalies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own anomalies"
  ON anomalies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_anomalies_user_unread ON anomalies(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_anomalies_product ON anomalies(product_id);

-- Saved comparisons table
CREATE TABLE IF NOT EXISTS saved_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  product_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own comparisons"
  ON saved_comparisons FOR ALL
  USING (auth.uid() = user_id);

-- AI insights cache table
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own insights"
  ON ai_insights_cache FOR ALL
  USING (auth.uid() = user_id);
