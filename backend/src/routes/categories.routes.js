const prisma = require('../lib/prisma');
const { buildCollectionRouter } = require('../utils/collectionRouterFactory');

module.exports = buildCollectionRouter({
  singular: 'category',
  model: prisma.category,
  joinDelegate: (p) => p.categorySong,
  joinFk: 'categoryId',
});
