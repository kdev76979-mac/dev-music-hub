const { z } = require('zod');

const email = z.string().trim().email().max(200);
const mobile = z.string().trim().regex(/^[0-9+\-\s()]{7,15}$/, 'Please enter a valid mobile number.');
// Real password policy: min 8 chars, at least one letter and one number.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200)
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

const registerUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  mobile,
  password,
  avatarUrl: z.string().trim().url().max(2000).optional().or(z.literal('')).optional(),
});

const loginUserSchema = z.object({
  identifier: z.string().trim().min(1), // email or mobile
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: email.optional(),
  avatarUrl: z.string().trim().url().max(2000).optional().or(z.literal('')).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const createManagerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  mobile: mobile.optional(),
  password,
});

const songSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  img: z.string().trim().url().max(2000).optional().or(z.literal('')),
  youtubeVideoId: z.string().trim().max(50).optional().or(z.literal('')),
});

const nameImgSchema = z.object({
  name: z.string().trim().min(1).max(120),
  img: z.string().trim().url().max(2000).optional().or(z.literal('')),
});

const heroYoutubeSchema = z.object({
  title: z.string().trim().max(200).optional(),
  artist: z.string().trim().max(200).optional(),
  img: z.string().trim().url().max(2000),
  youtubeVideoId: z.string().trim().min(1).max(50),
  caption: z.string().trim().max(300).optional(),
});

const feedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

const feedbackStatusSchema = z.object({
  status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED']),
});

const addSongToCollectionSchema = z.object({
  songId: z.string().trim().min(1).optional(),
  // Allow creating-and-attaching a brand-new (e.g. YouTube-picked) song in one call.
  song: songSchema.optional(),
}).refine((v) => v.songId || v.song, { message: 'Provide either songId or a song payload.' });

const brandSchema = z.object({
  brand: z.string().trim().min(1).max(80),
});

const youtubeSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(150),
  maxResults: z.coerce.number().int().min(1).max(25).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(30),
  q: z.string().trim().max(150).optional(),
});

module.exports = {
  registerUserSchema,
  loginUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  adminLoginSchema,
  createManagerSchema,
  songSchema,
  nameImgSchema,
  heroYoutubeSchema,
  feedbackSchema,
  feedbackStatusSchema,
  addSongToCollectionSchema,
  brandSchema,
  youtubeSearchQuerySchema,
  paginationSchema,
};
