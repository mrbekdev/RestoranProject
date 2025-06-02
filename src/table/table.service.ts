import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { OrderItemStatus, TableStatus } from '@prisma/client';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  // CREATE - Yangi stol yaratish
  async create(createTableDto: CreateTableDto) {
    try {
      const existingTable = await this.prisma.table.findUnique({
        where: { number: createTableDto.number }
      });

      if (existingTable) {
        throw new BadRequestException(`${createTableDto.number} raqamli stol allaqachon mavjud`);
      }

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
        message: 'Stol muvaffaqiyatli yaratildi'
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Stol yaratishda xatolik yuz berdi');
    }
  }

  // READ ALL - Barcha stollarni olish
  async findAll() {
    try {
      const tables = await this.prisma.table.findMany({
        include: {
          orders: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          }
        },
        orderBy: {
          number: 'asc'
        }
      });

      return {
        success: true,
        data: tables,
        message: 'Stollar ro\'yxati muvaffaqiyatli olindi'
      };
    } catch (error) {
      throw new BadRequestException('Stollar ro\'yxatini olishda xatolik yuz berdi');
    }
  }

  // READ ONE - ID bo'yicha bitta stolni olish
  async findOne(id: number) {
    try {
      const table = await this.prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  username: true
                }
              }
            }
          }
        }
      });

      if (!table) {
        throw new NotFoundException('Stol topilmadi');
      }

      return {
        success: true,
        data: table,
        message: 'Stol ma\'lumoti muvaffaqiyatli olindi'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Stol ma\'lumotini olishda xatolik yuz berdi');
    }
  }

  // READ BY NUMBER - Raqam bo'yicha stolni olish
  async findByNumber(number: number) {
    try {
      const table = await this.prisma.table.findUnique({
        where: { number },
        include: {
          orders: {
            where: {
              status: {
                not: 'ARCHIVE'
              }
            },
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });

      if (!table) {
        throw new NotFoundException('Stol topilmadi');
      }

      return {
        success: true,
        data: table,
        message: 'Stol ma\'lumoti muvaffaqiyatli olindi'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Stol ma\'lumotini olishda xatolik yuz berdi');
    }
  }

  // UPDATE - Stolni yangilash
  async update(id: number, updateTableDto: UpdateTableDto) {
    try {
      // Stolning mavjudligini tekshirish
      const existingTable = await this.prisma.table.findUnique({
        where: { id }
      });

      if (!existingTable) {
        throw new NotFoundException('Stol topilmadi');
      }

      // Agar raqam yangilanayotgan bo'lsa, takrorlanishni tekshirish
      if (updateTableDto.number && updateTableDto.number !== existingTable.number) {
        const duplicateTable = await this.prisma.table.findUnique({
          where: { number: updateTableDto.number }
        });

        if (duplicateTable) {
          throw new BadRequestException(`${updateTableDto.number} raqamli stol allaqachon mavjud`);
        }
      }

      const updatedTable = await this.prisma.table.update({
        where: { id },
        data: {
          name:updateTableDto.name,
          number: updateTableDto.number,
          status: updateTableDto.status || 'empty', // Agar status berilmagan bo'lsa, eski statusni saqlash
        },
      });

      return {
        success: true,
        data: updatedTable,
        message: 'Stol ma\'lumoti muvaffaqiyatli yangilandi'
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Stol ma\'lumotini yangilashda xatolik yuz berdi');
    }
  }

  // DELETE - Stolni o'chirish
  async remove(id: number) {
    try {
      const existingTable = await this.prisma.table.findUnique({
        where: { id }
      });

      if (!existingTable) {
        throw new NotFoundException('Stol topilmadi');
      }

      // Stolda aktiv buyurtmalar bor-yo'qligini tekshirish
      const activeOrders = await this.prisma.order.findMany({
        where: {
          tableId: id,
          status: {
            not: 'ARCHIVE'
          }
        }
      });

      if (activeOrders.length > 0) {
        throw new BadRequestException('Stolda aktiv buyurtmalar mavjud. Avval ularni tugatib oling.');
      }

      const deletedTable = await this.prisma.table.delete({
        where: { id }
      });

      return {
        success: true,
        data: deletedTable,
        message: 'Stol muvaffaqiyatli o\'chirildi'
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Stolni o\'chirishda xatolik yuz berdi');
    }
  }

  // UTILITY METHODS

  // Bo'sh stollarni olish
  async findAvailable() {
    try {
      const tables = await this.prisma.table.findMany({
        where: {
          orders: {
            none: {
              status: {
                in: ['PENDING', 'COOKING', 'READY']
              }
            }
          }
        },
        orderBy: {
          number: 'asc'
        }
      });

      return {
        success: true,
        data: tables,
        message: 'Bo\'sh stollar ro\'yxati olindi'
      };
    } catch (error) {
      throw new BadRequestException('Bo\'sh stollarni olishda xatolik yuz berdi');
    }
  }

  // Band stollarni olish
  async findOccupied() {
    try {
      const tables = await this.prisma.table.findMany({
        where: {
          orders: {
            some: {
              status: {
                in: ['PENDING', 'COOKING', 'READY']
              }
            }
          }
        },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'COOKING', 'READY']
              }
            },
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          }
        },
        orderBy: {
          number: 'asc'
        }
      });

      return {
        success: true,
        data: tables,
        message: 'Band stollar ro\'yxati olindi'
      };
    } catch (error) {
      throw new BadRequestException('Band stollarni olishda xatolik yuz berdi');
    }
  }

  // Stol statistikasini olish
  async getStatistics(id: number) {
    try {
      const tableStats = await this.prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            include: {
              orderItems: true
            }
          }
        }
      });

      if (!tableStats) {
        throw new NotFoundException('Stol topilmadi');
      }

      const totalOrders = tableStats.orders.length;
      const completedOrders = tableStats.orders.filter(order => order.status === 'COMPLETED').length;
      const totalRevenue = tableStats.orders
        .filter(order => order.status === 'COMPLETED')
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
            averageOrderValue
          }
        },
        message: 'Stol statistikasi muvaffaqiyatli olindi'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Stol statistikasini olishda xatolik yuz berdi');
    }
  }
  async updateStatus(tableId: number, status: TableStatus) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return await this.prisma.table.update({
      where: { id: tableId },
      data: { status: status },
    });
  }
}