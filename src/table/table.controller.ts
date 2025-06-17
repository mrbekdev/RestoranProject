import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Tables')
@Controller('tables')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi stol yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Stol muvaffaqiyatli yaratildi'
  })
  @ApiResponse({
    status: 400,
    description: 'Noto\'g\'ri ma\'lumot yoki stol allaqachon mavjud'
  })
  @ApiBody({ type: CreateTableDto })
  // @Roles('BIGADMIN', 'CASHIER')
  async create(@Body(ValidationPipe) createTableDto: CreateTableDto) {
    return await this.tableService.create(createTableDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha stollarni olish' })
  @ApiResponse({
    status: 200,
    description: 'Stollar ro\'yxati muvaffaqiyatli olindi'
  })
  async findAll() {
    return await this.tableService.findAll();
  }

  @Get('available')
  @ApiOperation({ summary: 'Bo\'sh stollarni olish' })
  @ApiResponse({
    status: 200,
    description: 'Bo\'sh stollar ro\'yxati olindi'
  })
  async findAvailable() {
    return await this.tableService.findAvailable();
  }

  @Get('occupied')
  @ApiOperation({ summary: 'Band stollarni olish' })
  @ApiResponse({
    status: 200,
    description: 'Band stollar ro\'yxati olindi'
  })
  async findOccupied() {
    return await this.tableService.findOccupied();
  }

  @Get('number/:number')
  @ApiOperation({ summary: 'Raqam bo\'yicha stolni olish' })
  @ApiParam({
    name: 'number',
    type: 'number',
    description: 'Stol raqami',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Stol ma\'lumoti muvaffaqiyatli olindi'
  })
  @ApiResponse({
    status: 404,
    description: 'Stol topilmadi'
  })
  async findByNumber(@Param('number', ParseIntPipe) number: string) {
    return await this.tableService.findByNumber(number);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha stolni olish' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Stol ID raqami',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Stol ma\'lumoti muvaffaqiyatli olindi'
  })
  @ApiResponse({
    status: 404,
    description: 'Stol topilmadi'
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.tableService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Stol statistikasini olish' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Stol ID raqami',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Stol statistikasi muvaffaqiyatli olindi'
  })
  @ApiResponse({
    status: 404,
    description: 'Stol topilmadi'
  })
  // @Roles('BIGADMIN', 'CASHIER')
  async getStatistics(@Param('id', ParseIntPipe) id: number) {
    return await this.tableService.getStatistics(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Stolni yangilash' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Stol ID raqami',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Stol ma\'lumoti muvaffaqiyatli yangilandi'
  })
  @ApiResponse({
    status: 404,
    description: 'Stol topilmadi'
  })
  @ApiResponse({
    status: 400,
    description: 'Noto\'g\'ri ma\'lumot yoki stol raqami allaqachon mavjud'
  })
  @ApiBody({ type: UpdateTableDto })
  // @Roles('BIGADMIN', 'CASHIER')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateTableDto: UpdateTableDto
  ) {
    return await this.tableService.update(id, updateTableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Stolni o\'chirish' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Stol ID raqami',
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Stol muvaffaqiyatli o\'chirildi'
  })
  @ApiResponse({
    status: 404,
    description: 'Stol topilmadi'
  })
  @ApiResponse({
    status: 400,
    description: 'Stolda aktiv buyurtmalar mavjud'
  })
  // @Roles('BIGADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.tableService.remove(id);
  }
}