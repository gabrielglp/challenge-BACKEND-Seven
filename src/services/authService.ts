import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import { UserAuth, UserRole } from '../types/user';
import { SignOptions } from 'jsonwebtoken';
import { prisma } from './prismaClient';

interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  cpf?: string;
  specialty?: string;
  daily_limit?: number;
  min_interval_minutes?: number;
  availability?: any;
}

interface LoginData {
  email: string;
  password: string;
}

export default {
  generateToken(id: string): string {
    const options: SignOptions = {
      expiresIn: authConfig.expiresIn
    };
    
    return jwt.sign(
      { id }, 
      authConfig.secret as string, 
      options
    );
  },

  async validateUserExists(email: string) {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new Error('Usuário já existe com este e-mail');
    }
  },

  async validateClientRegistrationData(role: UserRole, phone?: string, cpf?: string) {
    if (role === UserRole.CLIENT && (!phone || !cpf)) {
      throw new Error('Telefone e CPF são obrigatórios para cadastro de clientes');
    }
  },

  async validateSpecialistRegistrationData(role: UserRole, specialty?: string) {
    if (role === UserRole.SPECIALIST && !specialty) {
      throw new Error('Especialidade é obrigatória para cadastro de especialistas');
    }
  },

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  },

  async createUser(userData: { name: string; email: string; password: string; role: UserRole }) {
    const hashedPassword = await this.hashPassword(userData.password);
    
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
      },
    });
  },

  async createClientProfile(userId: string, phone: string, cpf: string) {
    const clientProfile = await prisma.client.create({
      data: {
        user_id: userId,
        phone,
        cpf,
      },
    });
    
    console.log(`Perfil de cliente criado: ${clientProfile.id} para usuário ${userId}`);
    return clientProfile;
  },

  async createSpecialistProfile(
    userId: string, 
    specialty: string, 
    daily_limit = 8, 
    min_interval_minutes = 30, 
    availability = {}
  ) {
    const specialistProfile = await prisma.specialist.create({
      data: {
        user_id: userId,
        specialty,
        daily_limit,
        min_interval_minutes,
        availability,
      },
    });
    
    console.log(`Perfil de especialista criado: ${specialistProfile.id} para usuário ${userId}`);
    return specialistProfile;
  },

  createUserAuthResponse(user: any, token: string): UserAuth {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      token,
    };
  },

  async registerUser(data: RegisterUserData) {
    const { 
      name, 
      email, 
      password, 
      role = UserRole.CLIENT, 
      phone, 
      cpf, 
      specialty,
      daily_limit,
      min_interval_minutes,
      availability 
    } = data;

    await this.validateUserExists(email);
    await this.validateClientRegistrationData(role, phone, cpf);
    await this.validateSpecialistRegistrationData(role, specialty);

    const user = await this.createUser({ name, email, password, role });

    let clientProfile = null;
    if (role === UserRole.CLIENT && phone && cpf) {
      clientProfile = await this.createClientProfile(user.id, phone, cpf);
    }
    
    let specialistProfile = null;
    if (role === UserRole.SPECIALIST && specialty) {
      specialistProfile = await this.createSpecialistProfile(
        user.id, 
        specialty, 
        daily_limit, 
        min_interval_minutes, 
        availability
      );
    }

    const token = this.generateToken(user.id);
    const userAuth = this.createUserAuthResponse(user, token);
    
    return {
      ...userAuth,
      clientProfile: clientProfile ? { id: clientProfile.id } : null,
      specialistProfile: specialistProfile ? { id: specialistProfile.id } : null
    };
  },

  async findUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  },

  async validateUserIsActive(user: any) {
    if (!user.active) {
      throw new Error('Usuário desativado');
    }
  },

  async validatePassword(password: string, hashedPassword: string) {
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    
    if (!passwordMatch) {
      throw new Error('Senha incorreta');
    }
  },

  async loginUser(data: LoginData) {
    const { email, password } = data;

    const user = await this.findUserByEmail(email);
    
    await this.validateUserIsActive(user);
    await this.validatePassword(password, user.password);

    const token = this.generateToken(user.id);
    return this.createUserAuthResponse(user, token);
  }
};