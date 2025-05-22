FROM node:18-slim

WORKDIR /app

# Instalar OpenSSL e outras dependências necessárias
RUN apt-get update -y && \
    apt-get install -y openssl

# Copiar apenas os arquivos de dependências primeiro
COPY package*.json ./
COPY tsconfig.json ./

# Criar diretório prisma e copiar schema
RUN mkdir -p src/prisma
COPY src/prisma/schema.prisma src/prisma/

# Instalar todas as dependências incluindo as de desenvolvimento
RUN npm install

# Instalar Prisma globalmente
RUN npm install -g prisma

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar o resto dos arquivos
COPY . .

EXPOSE 3000

# Usar o script de desenvolvimento
CMD ["npm", "run", "dev"]