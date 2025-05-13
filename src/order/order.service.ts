import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) { }

async create(data: CreateOrderDto) {
  // Foydalanuvchi mavjudligini tekshirish
  const customer = await this.prisma.user.findUnique({
    where: { id: data.userId },
  });
  if (!customer) {
    throw new NotFoundException('Customer not found');
  }

  // Mahsulotlar mavjudligini tekshirish va totalPrice hisoblash
  let totalPrice = 0;
  // Takrorlanmaydigan productId larni olish
  const productIds = [...new Set(data.products.map((item) => item.productId))];
  const products = await this.prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // Agar barcha mahsulotlar topilmasa
  if (products.length !== productIds.length) {
    throw new NotFoundException('One or more products not found');
  }

  // TotalPrice ni hisoblash
  for (const item of data.products) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${item.productId} not found`);
    }
    totalPrice += Number(product.price) * item.count;
  }

  // Order yaratish
  return await this.prisma.order.create({
    data: {
      tableNumber: data.tableNumber,
      status: data.status as OrderStatus,
      totalPrice,
      user: { connect: { id: data.userId } },
      orderItems: {
        create: data.products.map((item) => ({
          productId: item.productId,
          count: item.count,
        })),
      },
    },
    include: {
      user: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

async update(id: number, data: UpdateOrderDto) {
  const order = await this.prisma.order.findUnique({
    where: { id },
  });
  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // Agar products berilgan bo'lsa, totalPrice ni qayta hisoblash
  let totalPrice = order.totalPrice;
  if (data.products) {
    // Takrorlanmaydigan productId larni olish
    const productIds = [...new Set(data.products.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Agar barcha mahsulotlar topilmasa
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // TotalPrice ni hisoblash
    totalPrice = 0;
    for (const item of data.products) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
      totalPrice += Number(product.price) * item.count;
    }

    // Eski OrderItem'larni o'chirish
    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });
  }

  return await this.prisma.order.update({
    where: { id },
    data: {
      tableNumber: data.tableNumber,
      status: data.status as OrderStatus,
      totalPrice: totalPrice,
      user: data.userId ? { connect: { id: data.userId } } : undefined,
      orderItems: data.products
        ? {
            create: data.products.map((item) => ({
              productId: item.productId,
              count: item.count,
            })),
          }
        : undefined,
    },
    include: {
      user: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
}
  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // OrderItem'larni o'chirish
    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    return await this.prisma.order.delete({
      where: { id },
    });
  }
}