export enum UserRole {
  CLIENT = 'client',
  SPECIALIST = 'specialist',
  SCHEDULER = 'scheduler',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  priority: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  priority?: boolean;
  active?: boolean;
}

export interface UserAuth {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface UserExtended extends User {
  clientProfile?: any;
  specialistProfile?: any;
}