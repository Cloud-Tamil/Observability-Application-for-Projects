import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { asyncHandler, HttpError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth';
import { generateRefreshToken, refreshExpiry, signAccess } from '../lib/tokens';
import { requireAuth } from '../middleware/auth';
import type { User } from '@prisma/client';

export const authRouter = Router();

function publicUser(u: Pick<User, 'id' | 'email' | 'name' | 'role'>) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

async function issueTokens(user: Pick<User, 'id' | 'email' | 'role'>) {
  const accessToken = signAccess({
    sub: user.id,
    email: user.email,
    role: user.role as 'CUSTOMER' | 'ADMIN',
  });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiry() },
  });
  return { accessToken, refreshToken };
}

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name: string;
    };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const tokens = await issueTokens(user);
    res.status(201).json({ user: publicUser(user), ...tokens });
  })
);

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, 'Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  })
);

authRouter.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new HttpError(401, 'Invalid refresh token');
    }
    // Rotate: delete old, issue new.
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await issueTokens(stored.user);
    res.json({ user: publicUser(stored.user), ...tokens });
  })
);

authRouter.post(
  '/logout',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.status(204).end();
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: publicUser(user) });
  })
);
