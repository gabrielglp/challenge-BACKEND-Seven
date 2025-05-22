# Sistema de Agendamentos - API Backend

Este é um sistema completo de agendamentos desenvolvido com **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, **MySQL** e **Redis**, oferecendo controle de disponibilidade para especialistas, gestão de clientes, usuários, webhooks e testes automatizados com **Jest**.

## Índice

- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Rodando o Sistema](#rodando-o-sistema)
  - [Com Docker](#com-docker)
  - [Convencionalmente](#convencionalmente)
- [Ferramentas de Desenvolvimento](#ferramentas-de-desenvolvimento)
- [Detalhes Técnicos](#detalhes-técnicos)
  - [Estrutura de Diretórios](#estrutura-de-diretórios)
  - [Filas com BullMQ](#filas-com-bullmq)
  - [Roles do Sistema](#roles-do-sistema)
  - [Configuração de Webhooks](#configuração-de-webhooks)
- [Documentação da API](#documentação-da-api)
- [Testes](#testes)
  - [Configuração dos Testes](#configuração-dos-testes)
  - [Estrutura dos Testes](#estrutura-dos-testes)
  - [Comandos de Teste](#comandos-de-teste)
- [Solução de Problemas](#solução-de-problemas)

## Funcionalidades

- **Autenticação**: Suporte a JWT para autenticação segura.
- **Gestão de Usuários**: Perfis distintos (Admin, Doctor, Receptionist, Patient) com permissões específicas.
- **Disponibilidade de Especialistas**: Configuração de horários disponíveis para agendamentos.
- **Agendamentos**: Criação, edição, cancelamento e confirmação de consultas.
- **Notificações**: Lembretes automáticos (ex.: 24h antes) e confirmações via filas.
- **Webhooks**: Integração com sistemas externos para eventos em tempo real.
- **Logs de Auditoria**: Registro de atividades críticas do sistema.
- **Processamento Assíncrono**: Filas para tarefas como notificações e expiração de agendamentos.

## Pré-requisitos

- **Node.js**: v18+
- **MySQL**: v8+
- **Redis**: v7+
- **Docker e Docker Compose** (opcional, para execução via containers)
- **npm** ou **yarn**
- **ngrok** (para testes de webhooks em ambiente local)

## Configuração do Ambiente

1. **Clone o Repositório**:

   ```bash
   git clone https://github.com/seu-usuario/challenge-BACKEND-Seven.git
   cd challenge-BACKEND-Seven
   ```

2. **Crie o Arquivo `.env`** (baseado em `.env.example`):
   ```
   DATABASE_URL="mysql://root:password@localhost:3306/agenda_api"
   JWT_SECRET="your-jwt-secret-key"
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   PORT=3000
   NODE_ENV=development
   ADMIN_USER="admin"
   ADMIN_PASSWORD="strongpassword"
   WEBHOOK_SECRET="dev-secret-123"
   ```

## Rodando o Sistema

### Com Docker

1. Certifique-se de que **Docker** e **Docker Compose** estão instalados.
2. Execute na raiz do projeto:
   ```bash
   docker-compose up --build
   ```
3. Containers iniciados:
   - `agenda-api`: Aplicação Node.js (porta 3000)
   - `agenda-mysql`: MySQL (porta 3306)
   - `agenda-redis`: Redis (porta 6379)
4. Acesse:
   - API: `http://localhost:3000/api`
   - Documentação Swagger: `http://localhost:3000/api/docs`
   - Painel de Filas (Bull Board): `http://localhost:3000/admin/queues` (usuário: `admin`, senha: `strongpassword`)

### Convencionalmente

1. Certifique-se de que **MySQL** e **Redis** estão em execução.
2. Configure o banco de dados:
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE agenda_api;
   EXIT;
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute as migrações do Prisma:
   ```bash
   npx prisma migrate dev
   ```
5. Inicie o servidor:
   ```bash
   npm run dev
   ```
6. Acesse a API em `http://localhost:3000/api`.

## Ferramentas de Desenvolvimento

- **MySQL**:
  - **Linux/macOS**: `sudo service mysql start` ou `sudo systemctl start mysql`
  - **Windows**: `net start mysql`
- **Redis**:
  - **Linux/macOS**: `redis-server`
  - **Windows**: Use [Redis para Windows](https://github.com/microsoftarchive/redis/releases) ou [Memurai](https://www.memurai.com/).
- **ngrok** (para webhooks):
  1. Instale o ngrok: [ngrok.com](https://ngrok.com/download)
  2. Navegue até `dev-tools`:
     ```bash
     cd dev-tools
     npm install
     npm run build
     npm run start
     ```
  3. Inicie o ngrok:
     ```bash
     ngrok http 3001
     ```
  4. Use a URL HTTPS gerada (ex.: `https://abcd1234.ngrok.io`) como URL do webhook, incluindo o header `X-Webhook-Secret` com a chave `WEBHOOK_SECRET`.

## Detalhes Técnicos

### Estrutura de Diretórios

```
.
├── dev-tools                  # Ferramentas para testes de webhooks
├── dist                       # Código compilado (TypeScript)
├── docker                     # Configurações Docker
├── src
│   ├── config                 # Configurações da aplicação
│   ├── controllers            # Controladores da API
│   ├── middlewares            # Middlewares Express
│   ├── prisma                 # Schema e migrações do Prisma
│   ├── queues                 # Configuração de filas BullMQ
│   ├── routes                 # Rotas da API
│   ├── services               # Lógica de negócio
│   ├── tasks                  # Tarefas agendadas
│   ├── types                  # Definições de tipos TypeScript
│   ├── validators             # Validadores de entrada
│   ├── app.ts                 # Configuração do Express
│   └── server.ts              # Ponto de entrada
├── tests                      # Testes unitários e de integração
├── .env                       # Variáveis de ambiente
├── docker-compose.yml         # Configuração Docker Compose
├── package.json               # Dependências e scripts
└── swagger.json               # Documentação Swagger
```

### Filas com BullMQ

O sistema usa **BullMQ** com **Redis** para gerenciar tarefas assíncronas. Principais filas:

- **notificationQueue**: Lembretes (24h antes), confirmações e cancelamentos.
- **expirationQueue**: Expiração de agendamentos não confirmados.
- **webhookQueue**: Envio de eventos para URLs de webhook.
- Monitoramento: `http://localhost:3000/admin/queues`.

### Roles do Sistema

- **ADMIN**: Acesso total, incluindo gerenciamento de usuários e configurações.
- **DOCTOR**: Gerencia agendas e atendimentos.
- **RECEPTIONIST**: Gerencia agendamentos e pacientes.
- **PATIENT**: Visualiza e gerencia seus próprios agendamentos.

### Configuração de Webhooks

- **Chave Secreta**: Definida em `WEBHOOK_SECRET` no `.env` (ex.: `dev-secret-123`).
- **URL do Webhook**: Use a URL HTTPS do ngrok (ex.: `https://[subdominio].ngrok-free.app/webhook`).
- **Segurança**: Inclua a chave secreta no header `X-Webhook-Secret`. Em produção, altere a chave para maior segurança.

## Documentação da API

Acesse a documentação Swagger em `http://localhost:3000/api/docs`. Principais endpoints:

- `/api/auth`: Autenticação e registro.
- `/api/users`: Gerenciamento de usuários.
- `/api/specialists`: Configuração de especialistas e disponibilidade.
- `/api/clients`: Gerenciamento de clientes.
- `/api/appointments`: Gerenciamento de agendamentos.
- `/api/audit-logs`: Logs de auditoria.
- `/api/webhooks`: Configuração de webhooks.

## Testes

### Configuração dos Testes

- **Ferramenta**: Jest com TypeScript.
- **Dependências**:
  ```json
  {
    "devDependencies": {
      "@types/jest": "^29.5.14",
      "@types/supertest": "^2.0.12",
      "jest": "^29.7.0",
      "jest-environment-node": "^29.7.0",
      "jest-mock-extended": "^4.0.0-beta1",
      "supertest": "^6.3.3",
      "ts-jest": "^29.3.4"
    }
  }
  ```
- **Jest Config** (`jest.config.ts`):
  - Preset: `ts-jest`
  - Ambiente: `node`
  - Timeout: 30 segundos
  - Workers: 1 (evita conflitos)
  - Cobertura: Relatórios automáticos.

### Estrutura dos Testes

```
tests/
├── helpers/                    # Utilitários
│   ├── close-queues.ts        # Fecha filas
│   ├── database-cleanup.ts    # Limpa banco
│   ├── global-teardown.ts     # Limpeza global
│   └── teardown.ts           # Limpeza por teste
├── mocks/                     # Mocks
│   ├── bullmq-mock.ts        # Mock de filas
│   ├── fetch.mock.ts         # Mock de HTTP
│   ├── prisma.mock.ts        # Mock do Prisma
│   ├── redis-mock.ts         # Mock do Redis
│   └── webhook-service.mock.ts # Mock de webhooks
├── setup/
│   └── setupTests.ts         # Configuração inicial
├── unit/                     # Testes unitários
│   ├── appointmentController.test.ts
│   ├── appointmentValidator.test.ts
│   ├── authController.test.ts
│   ├── authMiddleware.test.ts
│   ├── availabilityService.test.ts
│   ├── notificationQueue.test.ts
│   └── notificationService.test.ts
└── webhook.test.ts           # Testes de integração
```

### Comandos de Teste

- **Todos os Testes**: `npm test`
- **Com Cobertura**: `npm test -- --coverage`
- **Testes Específicos**:
  - Unitários: `npm test -- tests/unit`
  - Arquivo específico: `npm test -- tests/unit/authController.test.ts`
  - Padrão: `npm test -- --testNamePattern="should create appointment"`
- **Modo Watch**: `npm test -- --watch`
- **Detectar Vazamentos**: `npm test -- --detectOpenHandles`
- **Verbose**: `npm test -- --verbose`
- **Testes que Falharam**: `npm test -- --onlyFailures`
- **Arquivos Modificados**: `npm test -- --changedSince=HEAD`
- **Relatório JSON**: `npm test -- --coverage --coverageReporters=json`
- **Atualizar Snapshots**: `npm test -- --updateSnapshot`
- **Debug**: `npm test -- --runInBand --detectOpenHandles`

## Solução de Problemas

- **MySQL**:
  - Verifique se o serviço está ativo.
  - Confirme credenciais no `.env`.
  - Certifique-se de que o banco `agenda_api` foi criado.
- **Redis**:
  - Verifique se o serviço está em execução.
  - Confirme host/porta no `.env`.
  - Reinicie o Redis.
- **Filas**:
  - Acesse `/admin/queues` para verificar status.
  - Consulte logs do servidor.
  - Confirme Redis ativo.
- **Webhooks**:
  - Verifique se o ngrok está ativo e a URL acessível.
  - Confirme a URL e a chave secreta no sistema.
  - Consulte logs em `dev-tools` e a fila de webhooks.
- **Testes**:
  - **Workers não encerram**: Use `npm test -- --detectOpenHandles`.
  - **Timeout**: Aumente timeout com `npm test -- --testTimeout=60000`.
  - **Cache**: Limpe com `npx jest --clearCache`.
  - **Conexões Redis/MySQL**: Verifique mocks e `setupFiles` no `jest.config.ts`.

---

**Desenvolvido como parte do desafio Backend Seven.**
