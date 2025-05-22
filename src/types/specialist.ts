import { User } from './user';

export interface Specialist {
  id: string;
  user_id: string;
  specialty: string;
  daily_limit: number;
  min_interval_minutes: number;
  availability: Record<string, string[]>;
  created_at: Date;
  updated_at: Date;
  user?: Partial<User>;
}

export interface SpecialistCreate {
  user_id: string;
  specialty: string;
  daily_limit?: number;
  min_interval_minutes?: number;
  availability?: Record<string, string[]>;
}