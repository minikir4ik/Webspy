-- Add is_own_product flag to tracked_products
ALTER TABLE tracked_products ADD COLUMN IF NOT EXISTS is_own_product boolean DEFAULT false;
