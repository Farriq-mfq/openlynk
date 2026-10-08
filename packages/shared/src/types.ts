export type DeviceType = "mobile" | "desktop" | "tablet" | "other";

export type ButtonStyle = "rounded" | "pill" | "square" | "outline";

export interface ThemeConfig {
  background_image_url?: string | null;
  custom_css?: string;
  [key: string]: unknown;
}

export type AdminStatus = "active" | "disabled";

export interface Admin {
  id: string;
  email: string;
  name: string;
  status: AdminStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  admin_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_published: boolean;
  theme: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  button_style: ButtonStyle;
  theme_config: ThemeConfig;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  profile_id: string;
  title: string;
  url: string;
  icon: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileView {
  id: string;
  profile_id: string;
  viewed_at: string;
  referrer_domain: string | null;
  country_code: string | null;
  device_type: DeviceType | null;
  session_hash: string | null;
}

export interface LinkClick {
  id: string;
  link_id: string;
  profile_id: string;
  clicked_at: string;
  referrer_domain: string | null;
  country_code: string | null;
  device_type: DeviceType | null;
  session_hash: string | null;
}

export interface AnalyticsDayPoint {
  day: string;
  views: number;
  unique_views: number;
  clicks: number;
  unique_clicks: number;
}

export interface AnalyticsSummary {
  range: "7d" | "30d";
  points: AnalyticsDayPoint[];
  total_views: number;
  total_clicks: number;
}

export interface LinkAnalytics {
  link_id: string;
  title: string;
  clicks: number;
  unique_clicks: number;
}
