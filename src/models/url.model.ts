export interface Url {
  id?: number;
  short_code: string;
  long_url: string;
  created_at?: Date;
  expires_at?: Date | null;
  is_custom: boolean;
}

export interface ClickAnalytics {
  id?: number;
  url_id: number;
  clicked_at: Date;
  ip_address: string;
  user_agent: string;
  referrer: string;
  country?: string;
}
