import { User } from './user';

export interface Client {
  id: string;
  user_id: string;
  phone: string;
  cpf: string;
  created_at: Date;
  updated_at: Date;
  user?: Partial<User>;
}

export interface ClientCreate {
  user_id: string;
  phone: string;
  cpf: string;
}