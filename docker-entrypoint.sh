#!/bin/sh
set -e

echo "Waiting for MySQL to be ready..."
while ! nc -z db 3306; do
    echo "MySQL is unavailable - sleeping"
    sleep 2
done
echo "MySQL is up!"

echo "Running Prisma migrations..."
npx prisma migrate deploy
npx prisma generate
npx prisma migrate dev --name init

echo "Starting application..."
exec npm run dev