const prisma = require('../lib/prisma');
const { buildCollectionRouter } = require('../utils/collectionRouterFactory');

module.exports = buildCollectionRouter({
  singular: 'artist',
  model: prisma.artist,
  joinDelegate: (p) => p.artistSong,
  joinFk: 'artistId',
});
