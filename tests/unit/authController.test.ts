import { Request, Response } from 'express';
import authController from '../../src/controllers/authController';
import { prisma } from '../../src/services/prismaClient';
import { UserRole } from '../../src/types/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

type MockResponse<T = any> = {
  status: jest.Mock<Response<T>>;
  json: jest.Mock<Response<T>>;
} & Partial<Response>;

jest.mock('../../src/services/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    client: {
      create: jest.fn(),
    },
    specialist: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: MockResponse;
  let responseObject: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {}
    };
    
    responseObject = {};
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(val => {
        responseObject = val;
        return mockResponse as Response;
      })
    } as MockResponse;

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (jwt.sign as jest.Mock).mockReturnValue('mock-token');
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        name: 'Teste',
        email: 'teste@email.com',
        password: 'senha123',
        role: UserRole.CLIENT,
        phone: '11999999999',
        cpf: '123.456.789-00'
      };

      const createdUser = {
        id: '738b7fd0-5db3-4821-b1a2-40fc6b89e1c8',
        name: userData.name,
        email: userData.email,
        password: 'hashed_password',
        role: userData.role,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequest.body = userData;
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (prisma.client.create as jest.Mock).mockResolvedValue({
        id: 'client-id',
        user_id: createdUser.id,
        phone: userData.phone,
        cpf: userData.cpf,
        created_at: new Date(),
        updated_at: new Date()
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          password: 'hashed_password',
          role: userData.role
        }
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          user_id: createdUser.id,
          phone: userData.phone,
          cpf: userData.cpf
        }
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toEqual({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        token: 'mock-token',
        clientProfile: { id: 'client-id' },
        specialistProfile: null
      });
    });

    it('deve retornar erro se email já existir', async () => {
      const userData = {
        name: 'Teste',
        email: 'existente@email.com',
        password: 'senha123',
        role: UserRole.CLIENT,
        phone: '11999999999',
        cpf: '123.456.789-00'
      };

      mockRequest.body = userData;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: userData.email,
        password: 'hashed_password',
        role: UserRole.CLIENT,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject.error).toBe('Usuário já existe com este e-mail');
    });
  });

  describe('login', () => {
    it('deve autenticar usuário com credenciais válidas', async () => {
      const loginData = {
        email: 'teste@email.com',
        password: 'senha123'
      };

      const user = {
        id: '738b7fd0-5db3-4821-b1a2-40fc6b89e1c8',
        name: 'Teste',
        email: loginData.email,
        password: 'hashed_password',
        role: UserRole.CLIENT,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequest.body = loginData;
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(responseObject).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: 'mock-token'
      });
    });

    it('deve retornar erro para credenciais inválidas', async () => {
      const loginData = {
        email: 'teste@email.com',
        password: 'senha_errada'
      };

      mockRequest.body = loginData;

      const user = {
        id: 'user-id',
        name: 'Test User',
        email: loginData.email,
        password: 'hashed_password',
        role: UserRole.CLIENT,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseObject.error).toBe('Senha incorreta');
    });

    it('deve retornar erro para usuário não encontrado', async () => {
      mockRequest.body = {
        email: 'naoexiste@email.com',
        password: 'senha123'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseObject.error).toBe('Usuário não encontrado');
    });
  });
});