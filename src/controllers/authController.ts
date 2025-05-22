import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import userValidator from '../validators/userValidator';
import { UserAuth, UserRole } from '../types/user';
import { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../services/prismaClient';

function generateToken(id: string): string {
  const options: SignOptions = {
    expiresIn: authConfig.expiresIn
  };
  
  return jwt.sign(
    { id }, 
    authConfig.secret as string, 
    options
  );
}

export default {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = userValidator.validate(req.body);
      if (validatedData.error) {
        return res.status(400).json({ error: validatedData.error.details[0].message });
      }

      const { name, email, password, role = UserRole.CLIENT } = req.body;

      if (role === UserRole.CLIENT && (!req.body.phone || !req.body.cpf)) {
        return res.status(400).json({ 
          error: 'Telefone e CPF são obrigatórios para cadastro de clientes' 
        });
      }
      
      if (role === UserRole.SPECIALIST && !req.body.specialty) {
        return res.status(400).json({ 
          error: 'Especialidade é obrigatória para cadastro de especialistas' 
        });
      }

      const userExists = await prisma.user.findUnique({
        where: { email },
      });

      if (userExists) {
        return res.status(400).json({ error: 'Usuário já existe com este e-mail' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
      });

      let clientProfile = null;
      if (role === UserRole.CLIENT) {
        clientProfile = await prisma.client.create({
          data: {
            user_id: user.id,
            phone: req.body.phone,
            cpf: req.body.cpf,
          },
        });
        
        console.log(`Perfil de cliente criado: ${clientProfile.id} para usuário ${user.id}`);
      }
      
      let specialistProfile = null;
      if (role === UserRole.SPECIALIST) {
        specialistProfile = await prisma.specialist.create({
          data: {
            user_id: user.id,
            specialty: req.body.specialty,
            daily_limit: req.body.daily_limit || 8,
            min_interval_minutes: req.body.min_interval_minutes || 30,
            availability: req.body.availability || {},
          },
        });
        
        console.log(`Perfil de especialista criado: ${specialistProfile.id} para usuário ${user.id}`);
      }

      const userAuth: UserAuth = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        token: generateToken(user.id),
      };
      
      return res.status(201).json({
        ...userAuth,
        clientProfile: clientProfile ? { id: clientProfile.id } : null,
        specialistProfile: specialistProfile ? { id: specialistProfile.id } : null
      });
    } catch (error: any) {
      console.error('Erro ao registrar usuário:', error);
      return res.status(500).json({ 
        error: `Erro ao cadastrar usuário: ${error.message || 'Erro interno do servidor'}` 
      });
    }
  },

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      if (!user.active) {
        return res.status(401).json({ error: 'Usuário desativado' });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      const token = generateToken(user.id);

      const userAuth: UserAuth = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        token,
      };

      return res.json(userAuth);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
};