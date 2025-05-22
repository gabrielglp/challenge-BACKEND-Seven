import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/user';

export default (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ 
        error: 'Acesso negado: permissão insuficiente para esta operação' 
      });
    }

    return next();
  };
};