import rateLimit from 'express-rate-limit';

export const printJobLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan print. Coba lagi dalam 1 menit.' },
});

export const servicePortalLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan portal. Coba lagi dalam 1 menit.' },
});
