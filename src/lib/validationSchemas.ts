import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid').min(1, 'Email wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  email: z.string().email('Email tidak valid').min(1, 'Email wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  shopName: z.string().min(2, 'Nama toko minimal 2 karakter').max(100),
  tenantId: z.string().uuid('ID tenant tidak valid').optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'KASIR', 'TEKNISI']).optional(),
  branchName: z.string().min(2, 'Nama cabang minimal 2 karakter').max(100).optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password baru tidak cocok',
    path: ['confirmPassword'],
  });

export const onboardingSchema = z.object({
  shopName: z.string().min(2, 'Nama toko minimal 2 karakter').max(100),
  ownerName: z.string().min(2, 'Nama pemilik minimal 2 karakter').max(100),
  ownerEmail: z.string().email('Email tidak valid'),
  ownerPassword: z.string().min(6, 'Password minimal 6 karakter'),
  themeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Warna tema tidak valid')
    .optional(),
});

export const upgradeTrialSchema = z.object({
  tier: z.enum(['PRO', 'ENTERPRISE']),
  billingCycle: z.enum(['monthly', 'annually']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpgradeTrialInput = z.infer<typeof upgradeTrialSchema>;
