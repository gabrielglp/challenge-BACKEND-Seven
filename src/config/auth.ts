import { SignOptions } from 'jsonwebtoken';

interface AuthConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
  refreshExpiresIn: SignOptions['expiresIn'];
}

const config: AuthConfig = {
  secret: process.env.JWT_SECRET || '$2b$09$lRHGP2NjJRlYEv8itu7QLucGp9v3x/Y44e1lhafEQQnDhYFhMnnOy',
  expiresIn: '1d',
  refreshExpiresIn: '7d',
};

export default config;