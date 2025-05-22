#!/bin/bash
# Espera pelo banco de dados MySQL estar pronto
echo "Esperando MySQL iniciar..."
sleep 10

# Aplica as migrações
echo "Aplicando migrações Prisma..."
npx prisma migrate deploy

# Inicia a aplicação
echo "Iniciando aplicação..."
npm start