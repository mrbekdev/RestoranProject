import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthCheckDto, UpdateAuthCheckDto } from './dto/create-auth-check.dto';


@Injectable()
export class AuthCheckService {
  constructor(private readonly prisma: PrismaService) {}

  private convertToBoolean(value: boolean | string): boolean {
    return typeof value === 'string' ? value.toLowerCase() === 'true' : !!value;
  }

  async create(createAuthCheckDto: CreateAuthCheckDto){
    const { status } = createAuthCheckDto;
    const booleanStatus = this.convertToBoolean(status);

    return this.prisma.authCheck.create({
      data: {
        status: booleanStatus,
      },
    });
  }

  async findAll() {
    return this.prisma.authCheck.findMany();
  }

  async findOne(id: number){
    const authCheck = await this.prisma.authCheck.findUnique({
      where: { id },
    });
    if (!authCheck) {
      throw new NotFoundException(`AuthCheck with ID ${id} not found`);
    }
    return authCheck;
  }

  async update(id: number, updateAuthCheckDto: UpdateAuthCheckDto){
    const { status } = updateAuthCheckDto;
    const booleanStatus = status !== undefined ? this.convertToBoolean(status) : undefined;

    return this.prisma.authCheck.update({
      where: { id },
      data: { status: booleanStatus },
    });
  }

  async remove(id: number) {
    const authCheck = await this.findOne(id);
    await this.prisma.authCheck.delete({
      where: { id },
    });
  }
}