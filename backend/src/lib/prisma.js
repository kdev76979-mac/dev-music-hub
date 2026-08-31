const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance across the app (and across hot
// reloads in dev) instead of opening a new connection pool per request.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
