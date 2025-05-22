import { UserRole } from './user';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};