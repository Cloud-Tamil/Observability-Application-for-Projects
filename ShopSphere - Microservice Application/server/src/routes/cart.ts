import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addItemSchema, updateItemSchema } from '../schemas/cart';
import { asyncHandler, HttpError } from '../middleware/error';

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.sub },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
    const subtotalCents = items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0
    );
    res.json({ items, subtotalCents });
  })
);

cartRouter.post(
  '/items',
  validate({ body: addItemSchema }),
  asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body as {
      productId: string;
      quantity: number;
    };
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, 'Product not found');

    const item = await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId: req.user!.sub, productId },
      },
      create: { userId: req.user!.sub, productId, quantity },
      update: { quantity: { increment: quantity } },
      include: { product: true },
    });
    res.status(201).json({ item });
  })
);

cartRouter.patch(
  '/items/:id',
  validate({ body: updateItemSchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.cartItem.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw new HttpError(404, 'Cart item not found');

    const item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: (req.body as { quantity: number }).quantity },
      include: { product: true },
    });
    res.json({ item });
  })
);

cartRouter.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const result = await prisma.cartItem.deleteMany({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (result.count === 0) throw new HttpError(404, 'Cart item not found');
    res.status(204).end();
  })
);

cartRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.sub } });
    res.status(204).end();
  })
);
