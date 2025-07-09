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

      // Create product and set index equal to the auto-incremented id
      return await this.prisma.product.create({
        data: {
          name: data.name,
          price: data.price,
          image: data.image || null,
          date: data.date || null,
          index: undefined, // Let Prisma handle id auto-increment, we'll set index = id after creation
          category: data.categoryId ? { connect: { id: Number(data.categoryId) } } : undefined,
          assignedTo: data.assignedToId ? { connect: { id: Number(data.assignedToId) } } : undefined,
        },
      }).then(async (product) => {
        // Update the index to match the id after creation
        return await this.prisma.product.update({
          where: { id: product.id },
          data: { index: +product.id },
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  async syncIndicesWithIds() {
    try {
      const products = await this.prisma.product.findMany();
      if (!products.length) {
        return { message: 'No products found to synchronize' };
      }

      const updates = products.map((product) =>
        this.prisma.product.update({
          where: { id: product.id },
          data: { index: product.id },
        }),
      );

      await this.prisma.$transaction(updates);

      return { message: `Synchronized indices with IDs for ${products.length} products` };
    } catch (error) {
      throw new BadRequestException('Failed to synchronize product indices: ' + error.message);
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
          isFinished:data?.isFinished,
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

  async swapIndices(index1: number, index2: number) {
    try {
      const product1 = await this.prisma.product.findFirst({
        where: { index: index1 },
      });
      const product2 = await this.prisma.product.findFirst({
        where: { index: index2 },
      });

      if (!product1 || !product2) {
        throw new NotFoundException(`One or both products with indices ${index1} or ${index2} not found`);
      }

      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: product1.id },
          data: { index: index2 },
        }),
        this.prisma.product.update({
          where: { id: product2.id },
          data: { index: index1 },
        }),
      ]);

      return { message: `Indices ${index1} and ${index2} swapped successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to swap product indices: ' + error.message);
    }
  }

  async swapIds(id1: number, id2: number) {
    try {
      const product1 = await this.prisma.product.findUnique({
        where: { id: id1 },
        include: {
          category: true,
          assignedTo: true,
          orderItems: true,
        },
      });
      const product2 = await this.prisma.product.findUnique({
        where: { id: id2 },
        include: {
          category: true,
          assignedTo: true,
          orderItems: true,
        },
      });

      if (!product1 || !product2) {
        throw new NotFoundException(`One or both products not found`);
      }

      const tempId = -(Math.max(id1, id2) + 1);

      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: id1 },
          data: {
            id: tempId,
            index: tempId, // Update index to match the temporary ID
          },
        }),
        this.prisma.product.update({
          where: { id: id2 },
          data: {
            id: id1,
            index: id1, // Update index to match the new ID
          },
        }),
        this.prisma.product.update({
          where: { id: tempId },
          data: {
            id: id2,
            index: id2, // Update index to match the new ID
          },
        }),
      ]);

      return { message: `IDs and indices of products ${id1} and ${id2} swapped successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to swap product IDs: ' + error.message);
    }
  }
}