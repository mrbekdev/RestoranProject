import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    // Verify customer exists
    const customer = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify all products exist
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: data.productIds },
      },
    });
    if (products.length !== data.productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    return await this.prisma.order.create({
      data: {
        user: {
          connect: { id: data.userId },
        },
        tableNumber: data.tableNumber,
        totalPrice: data.totalPrice,
        productIds: data.productIds,
        Product: {
          connect: data.productIds.map((productId) => ({ id: productId })),
        },
        status: data.status as OrderStatus,
      },
      include: {
        user: true,
        Product: true,
      },
    });
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: true,
        Product: true,
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        Product: true,
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

    return await this.prisma.order.update({
      where: { id },
      data: {
        user: data.userId
          ? { connect: { id: data.userId } }
          : undefined,
        totalPrice: data.totalPrice,
        tableNumber: data.tableNumber,
        status: data.status as OrderStatus,
        productIds: data.productIds,
        Product: data.productIds
          ? {
              set: [], // Disconnect existing products
              connect: data.productIds.map((productId) => ({ id: productId })),
            }
          : undefined,
      },
      include: {
        user: true,
        Product: true,
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

    return await this.prisma.order.delete({
      where: { id },
    });
  }
}