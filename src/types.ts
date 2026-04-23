export interface Account {
  username: string;
  name?: string;
  followers_count?: number;
  profile_image_url?: string;
}

export interface Activity {
  created_at: string;
  target_url: string;
  durum: string;
  status: 'info' | 'success' | 'error';
}

export type Tab = 'overview' | 'actions' | 'boost' | 'logs';
