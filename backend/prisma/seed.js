/**
 * Secure initial setup.
 *
 * Creates the first Developer account from ADMIN_EMAIL / ADMIN_PASSWORD
 * environment variables (never hardcoded, never sent to the frontend as
 * plaintext — only the resulting Argon2 hash is stored). Safe to re-run:
 * it skips creation if a developer account already exists.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ng-Passw0rd!' node prisma/seed.js
 * or, with a .env file already populated:
 *   npm run seed
 */
require('dotenv').config();
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const mobile = process.env.ADMIN_MOBILE || null;
  const name = process.env.ADMIN_NAME || 'Developer';

  const existingDeveloper = await prisma.adminAccount.findFirst({ where: { role: 'DEVELOPER' } });
  if (existingDeveloper) {
    console.log(`A developer account already exists (${existingDeveloper.email}). Skipping developer creation.`);
  } else {
    if (!email || !password) {
      console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to create the first developer account.');
      process.exitCode = 1;
    } else {
      if (password.length < 8) {
        console.error('ADMIN_PASSWORD must be at least 8 characters.');
        process.exitCode = 1;
      } else {
        const passwordHash = await argon2.hash(password);
        const dev = await prisma.adminAccount.create({
          data: { name, email: email.toLowerCase(), mobile, passwordHash, role: 'DEVELOPER' },
        });
        console.log(`Developer account created: ${dev.email}`);
        console.log('Log in with this email/mobile and the password you set in ADMIN_PASSWORD, then change it from Settings → Profile.');
      }
    }
  }

  // Seed a small demo catalog on first run only, so the site isn't empty.
  const songCount = await prisma.song.count();
  if (songCount === 0) {
    console.log('Seeding demo catalog (categories, artists, playlists)...');
    const demoSongs = [
      { title: 'Quiet Hours', artist: 'Ari Vane', img: 'https://picsum.photos/id/1074/300/300' },
      { title: 'Slow Tide', artist: 'Nova Sky', img: 'https://picsum.photos/id/1072/300/300' },
      { title: 'Blue November', artist: 'Sable Moon', img: 'https://picsum.photos/id/1082/300/300' },
      { title: 'Midnight Pulse', artist: 'Nova Sky', img: 'https://picsum.photos/id/1062/300/300' },
      { title: 'Afterglow', artist: 'Ari Vane', img: 'https://picsum.photos/id/1076/300/300' },
      { title: 'Heartline', artist: 'The Wander', img: 'https://picsum.photos/id/1084/300/300' },
      { title: 'Grid Runner', artist: 'Kilo Grid', img: 'https://picsum.photos/id/1080/300/300' },
      { title: 'Brass & Velvet', artist: 'Milo James', img: 'https://picsum.photos/id/1069/300/300' },
      { title: 'Paper Moon', artist: 'The Wander', img: 'https://picsum.photos/id/1078/300/300' },
      { title: 'Static Bloom', artist: 'Echo Fields', img: 'https://picsum.photos/id/1070/300/300' },
    ];
    const songs = {};
    for (const s of demoSongs) {
      songs[s.title] = await prisma.song.create({ data: s });
    }

    const categories = [
      { name: 'Relax', img: 'https://picsum.photos/id/1011/200/200', songTitles: ['Quiet Hours', 'Slow Tide'] },
      { name: 'Sad', img: 'https://picsum.photos/id/1016/200/200', songTitles: ['Blue November'] },
      { name: 'Party', img: 'https://picsum.photos/id/1021/200/200', songTitles: ['Midnight Pulse', 'Afterglow'] },
      { name: 'Romance', img: 'https://picsum.photos/id/1027/200/200', songTitles: ['Heartline'] },
      { name: 'Energetic', img: 'https://picsum.photos/id/1033/200/200', songTitles: ['Grid Runner'] },
      { name: 'Jazz', img: 'https://picsum.photos/id/1044/200/200', songTitles: ['Brass & Velvet', 'Paper Moon'] },
      { name: 'Alternative', img: 'https://picsum.photos/id/1050/200/200', songTitles: ['Static Bloom'] },
    ];
    for (const c of categories) {
      const cat = await prisma.category.create({ data: { name: c.name, img: c.img } });
      for (const title of c.songTitles) {
        await prisma.categorySong.create({ data: { categoryId: cat.id, songId: songs[title].id } });
      }
    }

    const artists = [
      { name: 'Nova Sky', img: 'https://i.pravatar.cc/200?img=12', songTitles: ['Midnight Pulse', 'Slow Tide'] },
      { name: 'Ari Vane', img: 'https://i.pravatar.cc/200?img=32', songTitles: ['Quiet Hours', 'Afterglow'] },
      { name: 'The Wander', img: 'https://i.pravatar.cc/200?img=45', songTitles: ['Heartline', 'Paper Moon'] },
      { name: 'Kilo Grid', img: 'https://i.pravatar.cc/200?img=8', songTitles: ['Grid Runner'] },
      { name: 'Sable Moon', img: 'https://i.pravatar.cc/200?img=25', songTitles: ['Blue November'] },
      { name: 'Milo James', img: 'https://i.pravatar.cc/200?img=51', songTitles: ['Brass & Velvet'] },
      { name: 'Echo Fields', img: 'https://i.pravatar.cc/200?img=15', songTitles: ['Static Bloom'] },
    ];
    for (const a of artists) {
      const artist = await prisma.artist.create({ data: { name: a.name, img: a.img } });
      for (const title of a.songTitles) {
        await prisma.artistSong.create({ data: { artistId: artist.id, songId: songs[title].id } });
      }
    }

    const playlists = [
      { name: 'Driving', img: 'https://picsum.photos/id/1035/400/400', songTitles: ['Grid Runner', 'Static Bloom'] },
      { name: 'Raining', img: 'https://picsum.photos/id/1043/400/400', songTitles: ['Quiet Hours', 'Blue November'] },
      { name: 'Love', img: 'https://picsum.photos/id/1062/400/400', songTitles: ['Heartline', 'Afterglow'] },
    ];
    for (const p of playlists) {
      const playlist = await prisma.playlist.create({ data: { name: p.name, img: p.img } });
      for (const title of p.songTitles) {
        await prisma.playlistSong.create({ data: { playlistId: playlist.id, songId: songs[title].id } });
      }
    }

    const heroSeed = [
      { title: 'Mountain Echoes', artist: 'Nova Sky', img: 'https://picsum.photos/id/1015/1200/500' },
      { title: 'City Lights', artist: 'Ari Vane', img: 'https://picsum.photos/id/1025/1200/500' },
      { title: 'Golden Hour', artist: 'The Wander', img: 'https://picsum.photos/id/1035/1200/500' },
    ];
    for (const h of heroSeed) {
      await prisma.heroItem.create({ data: { mediaType: 'YOUTUBE', title: h.title, artist: h.artist, img: h.img, youtubeVideoId: null } });
    }
  }

  await prisma.appSetting.upsert({ where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
