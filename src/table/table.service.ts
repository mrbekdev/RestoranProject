import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { OrderItemStatus, TableStatus } from '@prisma/client';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  // CREATE - Create a new table
  async create(createTableDto: CreateTableDto) {
    try {
      // Check if a table with the same number already exists
      const existingTable = await this.prisma.table.findUnique({
        where: { number: createTableDto.number },
      });

      if (existingTable) {
        throw new BadRequestException(`${createTableDto.number} raqamli stol allaqachon mavjud`);
      }

      // Create the new table
      const newTable = await this.prisma.table.create({
        data: {
          name: createTableDto.name,
          number: createTableDto.number,
          status: createTableDto.status || 'empty',
        },
      });

      return {
        success: true,
        data: newTable,
        message: 'Stol muvaffaqiyatli yaratildi',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Stol yaratishda xatolik yuz berdi');
    }
  }

  // READ ALL - Get all tables
  async findAll() {
    try {
      const tables = await this.prisma.table.findMany({
        include: {
          orders: {
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      return {
        success: true,
        data: tables,
        message: "Stollar ro'yxati muvaffaqiyatli olindi",
      };
    } catch (error) {
      throw new BadRequestException("Stollar ro'yxatini olishda xatolik yuz berdi");
    }
  }

  // READ ONE - Get a single table by ID
  async findOne(id: number) {
    try {
      const table = await this.prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!table) {
        throw new NotFoundException('Stol topilmadi');
      }

      return {
        success: true,
        data: table,
        message: "Stol ma'lumoti muvaffaqiyatli olindi",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Stol ma'lumotini olishda xatolik yuz berdi");
    }
  }

  // READ BY NUMBER - Get a table by its number
  async findByNumber(number: string) {
    try {
      const table = await this.prisma.table.findUnique({
        where: { number },
        include: {
          orders: {
            where: {
              status: {
                not: 'ARCHIVE',
              },
            },
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!table) {
        throw new NotFoundException('Stol topilmadi');
      }

      return {
        success: true,
        data: table,
        message: "Stol ma'lumoti muvaffaqiyatli olindi",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Stol ma'lumotini olishda xatolik yuz berdi");
    }
  }

  // UPDATE - Update a table
  async update(id: number, updateTableDto: UpdateTableDto) {
    try {
      // Check if the table exists
      const existingTable = await this.prisma.table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        throw new NotFoundException('Stol topilmadi');
      }

      // Check for duplicate number if it's being updated
      if (updateTableDto.number && updateTableDto.number !== existingTable.number) {
        const duplicateTable = await this.prisma.table.findUnique({
          where: { number: updateTableDto.number },
        });

        if (duplicateTable) {
          throw new BadRequestException(`${updateTableDto.number} raqamli stol allaqachon mavjud`);
        }
      }

      // Update the table
      const updatedTable = await this.prisma.table.update({
        where: { id },
        data: {
          name: updateTableDto.name,
          number: updateTableDto.number,
          status: updateTableDto.status || 'empty',
        },
      });

      return {
        success: true,
        data: updatedTable,
        message: "Stol ma'lumoti muvaffaqiyatli yangilandi",
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Stol ma'lumotini yangilashda xatolik yuz berdi");
    }
  }

  // DELETE - Delete a table
  async remove(id: number) {
    try {
      // Check if the table exists
      const existingTable = await this.prisma.table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        throw new NotFoundException('Stol topilmadi');
      }

      // Check for active orders
      const activeOrders = await this.prisma.order.findMany({
        where: {
          tableId: id,
          status: {
            not: 'ARCHIVE',
          },
        },
      });

      if (activeOrders.length > 0) {
        throw new BadRequestException('Stolda aktiv buyurtmalar mavjud. Avval ularni tugatib oling.');
      }

      // Delete the table
      const deletedTable = await this.prisma.table.delete({
        where: { id },
      });

      return {
        success: true,
        data: deletedTable,
        message: "Stol muvaffaqiyatli o'chirildi",
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Stolni o'chirishda xatolik yuz berdi");
    }
  }

  // UTILITY METHODS

  // Get available (empty) tables
  async findAvailable() {
    try {
      const tables = await this.prisma.table.findMany({
        where: {
          orders: {
            none: {
              status: {
                in: ['PENDING', 'COOKING', 'READY'],
              },
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      return {
        success: true,
        data: tables,
        message: "Bo'sh stollar ro'yxati olindi",
      };
    } catch (error) {
      throw new BadRequestException("Bo'sh stollarni olishda xatolik yuz berdi");
    }
  }

  // Get occupied tables
  async findOccupied() {
    try {
      const tables = await this.prisma.table.findMany({
        where: {
          orders: {
            some: {
              status: {
                in: ['PENDING', 'COOKING', 'READY'],
              },
            },
          },
        },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'COOKING', 'READY'],
              },
            },
            include: {
              orderItems: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      });

      return {
        success: true,
        data: tables,
        message: "Band stollar ro'yxati olindi",
      };
    } catch (error) {
      throw new BadRequestException("Band stollarni olishda xatolik yuz berdi");
    }
  }

  // Get table statistics
  async getStatistics(id: number) {
    try {
      const tableStats = await this.prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            include: {
              orderItems: true,
            },
          },
        },
      });

      if (!tableStats) {
        throw new NotFoundException('Stol topilmadi');
      }

      const totalOrders = tableStats.orders.length;
      const completedOrders = tableStats.orders.filter((order) => order.status === 'COMPLETED').length;
      const totalRevenue = tableStats.orders
        .filter((order) => order.status === 'COMPLETED')
        .reduce((sum, order) => sum + order.totalPrice, 0);
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

      return {
        success: true,
        data: {
          table: tableStats,
          statistics: {
            totalOrders,
            completedOrders,
            totalRevenue,
            averageOrderValue,
          },
        },
        message: 'Stol statistikasi muvaffaqiyatli olindi',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Stol statistikasini olishda xatolik yuz berdi');
    }
  }

  // Update table status
  async updateStatus(tableId: number, status: TableStatus) {
    try {
      const table = await this.prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        throw new NotFoundException('Table not found');
      }

      const updatedTable = await this.prisma.table.update({
        where: { id: tableId },
        data: { status },
      });

      return {
        success: true,
        data: updatedTable,
        message: 'Stol statusi muvaffaqiyatli yangilandi',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Stol statusini yangilashda xatolik yuz berdi');
    }
  }
}