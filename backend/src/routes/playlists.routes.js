const prisma = require('../lib/prisma');
const { buildCollectionRouter } = require('../utils/collectionRouterFactory');

module.exports = buildCollectionRouter({
  singular: 'playlist',
  model: prisma.playlist,
  joinDelegate: (p) => p.playlistSong,
  joinFk: 'playlistId',
});
