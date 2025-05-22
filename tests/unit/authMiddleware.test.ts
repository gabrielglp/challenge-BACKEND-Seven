import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

const mockUser = {
  findUnique: jest.fn(),
};

const mockPrismaInstance = {
  user: mockUser,
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));

jest.mock('../../src/config/auth', () => ({
  default: {
    secret: 'test-secret',
    expiresIn: '1d'
  }
}));

jest.mock('jsonwebtoken');

import authMiddleware from '../../src/middlewares/auth.unit';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: {},
      userId: undefined,
      userRole: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('deve retornar 401 quando não há token', async () => {
    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Autenticação necessária')
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o formato do token é inválido', async () => {
    mockRequest.headers = {
      authorization: 'InvalidToken',
    };

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve chamar next() com um token válido', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (jwt.verify as jest.Mock).mockReturnValue({ 
      id: 'user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    });

    mockUser.findUnique.mockResolvedValue({
      id: 'user-id',
      role: UserRole.ADMIN,
      active: true,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      priority: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userId).toBe('user-id');
    expect(mockRequest.userRole).toBe(UserRole.ADMIN);
  });

  it('deve retornar 401 para usuário inativo', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (jwt.verify as jest.Mock).mockReturnValue({ 
      id: 'user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    });

    mockUser.findUnique.mockResolvedValue({
      id: 'user-id',
      role: UserRole.ADMIN,
      active: false,
    });

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Usuário inativo ou não encontrado. Entre em contato com o administrador.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve retornar 401 para usuário não encontrado', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (jwt.verify as jest.Mock).mockReturnValue({ 
      id: 'user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    });

    mockUser.findUnique.mockResolvedValue(null);

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Usuário inativo ou não encontrado. Entre em contato com o administrador.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve retornar 401 para token inválido', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Token inválido');
    });

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token inválido ou expirado. Faça login novamente.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando scheme não é Bearer', async () => {
    mockRequest.headers = {
      authorization: 'Basic some-token',
    };

    await authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token mal formatado'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});