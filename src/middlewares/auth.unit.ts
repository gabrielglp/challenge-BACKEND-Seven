import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import authConfig from '../config/auth';
import { UserRole } from '../types/user';

const prisma = new PrismaClient();

interface TokenPayload {
  id: string;
  iat: number;
  exp: number;
}

export default async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Autenticação necessária. Faça login para continuar.' 
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  try {
    const decoded = jwt.verify(token, authConfig.secret) as TokenPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, active: true }
    });
    
    if (!user || !user.active) {
      return res.status(401).json({ 
        error: 'Usuário inativo ou não encontrado. Entre em contato com o administrador.' 
      });
    }
    
    req.userId = user.id;
    req.userRole = user.role as UserRole;
    
    return next();
  } catch (err) {
    return res.status(401).json({ 
      error: 'Token inválido ou expirado. Faça login novamente.' 
    });
  }
};