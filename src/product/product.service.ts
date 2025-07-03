import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    try {
      if (data.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: Number(data.categoryId) },
        });
        if (!category) {
          throw new NotFoundException(`Category with ID ${data.categoryId} not found`);
        }
      }

      if (data.assignedToId) {
        const user = await this.prisma.user.findUnique({
          where: { id: Number(data.assignedToId) },
        });
        if (!user || user.role !== Role.KITCHEN) {
          throw new NotFoundException(`Kitchen staff with ID ${data.assignedToId} not found`);
        }
      } else {
        const kitchenStaff = await this.prisma.user.findMany({
          where: { role: Role.KITCHEN },
        });
        if (!kitchenStaff.length) {
          throw new NotFoundException('No kitchen staff available');
        }
        data.assignedToId = kitchenStaff[Math.floor(Math.random() * kitchenStaff.length)].id;
      }

      // Index uchun oxirgi mahsulotning index qiymatini xavfsiz olish
      const lastProduct = await this.prisma.product.findFirst({
        orderBy: { index: 'desc' },
      });
      const newIndex = lastProduct ? String(parseInt(lastProduct.index || '0') + 1) : '1';

      return await this.prisma.product.create({
        data: {
          name: data.name,
          price: data.price,
          image: data.image || null,
          date: data.date || null,
          index: newIndex,
          category: data.categoryId ? { connect: { id: Number(data.categoryId) } } : undefined,
          assignedTo: data.assignedToId ? { connect: { id: Number(data.assignedToId) } } : undefined,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  async findAll() {
    return await this.prisma.product.findMany({
      include: {
        category: true,
        assignedTo: true,
      },
      orderBy: { index: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        assignedTo: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, data: UpdateProductDto) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      if (data.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: Number(data.categoryId) },
        });
        if (!category) {
          throw new NotFoundException(`Category with ID ${data.categoryId} not found`);
        }
      }

      if (data.assignedToId) {
        const user = await this.prisma.user.findUnique({
          where: { id: Number(data.assignedToId) },
        });
        if (!user || user.role !== Role.KITCHEN) {
          throw new NotFoundException(`Kitchen staff with ID ${data.assignedToId} not found`);
        }
      }

      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name || product.name,
          price: data.price !== undefined ? data.price : product.price,
          image: data.image || product.image,
          date: data.date || product.date,
          category: data.categoryId
            ? { connect: { id: Number(data.categoryId) } }
            : data.categoryId === null
            ? { disconnect: true }
            : undefined,
          assignedTo: data.assignedToId
            ? { connect: { id: Number(data.assignedToId) } }
            : data.assignedToId === null
            ? { disconnect: true }
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product: ' + error.message);
    }
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return await this.prisma.product.delete({
      where: { id },
    });
  }

  async swapIndices(id1: number, id2: number) {
    try {
      const product1 = await this.prisma.product.findUnique({
        where: { id: id1 },
      });
      const product2 = await this.prisma.product.findUnique({
        where: { id: id2 },
      });

      if (!product1 || !product2) {
        throw new NotFoundException(`One or both products not found`);
      }

      const index1 = product1.index;
      const index2 = product2.index;

      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: id1 },
          data: { index: index2 },
        }),
        this.prisma.product.update({
          where: { id: id2 },
          data: { index: index1 },
        }),
      ]);

      return { message: `Indices of products ${id1} and ${id2} swapped successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to swap product indices: ' + error.message);
    }
  }
}