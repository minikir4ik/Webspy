export type Plan = "free" | "starter" | "pro" | "business";
export type Platform = "shopify" | "amazon" | "walmart" | "generic";
export type StockStatus = "in_stock" | "out_of_stock" | "limited" | "unknown";
export type ProductStatus = "active" | "paused" | "broken" | "pending";
export type AlertRuleType =
  | "price_drop_percent"
  | "price_drop_absolute"
  | "price_below"
  | "price_above"
  | "price_increases"
  | "stock_change"
  | "competitor_undercuts_me";
export type NotifyChannel = "email";

export interface Profile {
  id: string;
  email: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  product_limit: number;
  check_interval_minutes: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TrackedProduct {
  id: string;
  project_id: string;
  user_id: string;
  url: string;
  platform: Platform;
  product_name: string | null;
  my_price: number | null;
  currency: string;
  last_check_at: string | null;
  next_check_at: string | null;
  last_price: number | null;
  last_stock_status: StockStatus | null;
  check_interval_override: number | null;
  status: ProductStatus;
  consecutive_failures: number;
  extraction_config: Record<string, unknown>;
  created_at: string;
}

export interface PriceCheck {
  id: string;
  product_id: string;
  price: number | null;
  original_price: number | null;
  currency: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  raw_extraction: Record<string, unknown> | null;
  confidence: number;
  checked_at: string;
}

export interface AlertRule {
  id: string;
  user_id: string;
  product_id: string;
  rule_type: AlertRuleType;
  threshold: number | null;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  is_active: boolean;
  notify_channels: NotifyChannel[];
  created_at: string;
}

export interface AlertHistory {
  id: string;
  rule_id: string | null;
  product_id: string;
  user_id: string;
  message: string;
  old_value: string | null;
  new_value: string | null;
  channels_sent: string[] | null;
  created_at: string;
}
