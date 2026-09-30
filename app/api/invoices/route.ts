import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, totalAmount, paidAmount, items } = body;

    const invoice = await prisma.invoice.create({
      data: {
        customerId: Number(customerId),
        totalAmount: parseFloat(totalAmount),
        paidAmount: parseFloat(paidAmount),
        items: {
          create: items.map((item: any) => ({
            productId: Number(item.productId),
            qty: Number(item.qty),
            unitPrice: parseFloat(item.unitPrice),
          })),
        },
      },
      include: { items: true },
    });

    // Automatically update stock for sold products
    for (const item of items) {
      await prisma.product.update({
        where: { id: Number(item.productId) },
        data: { stockQty: { decrement: Number(item.qty) } },
      });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
