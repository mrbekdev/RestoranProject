import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PercentService } from './percent.service';
import { CreatePercentDto } from './dto/create-percent.dto';
import { UpdatePercentDto } from './dto/update-percent.dto';

@Controller('percent')
export class PercentController {
  constructor(private readonly percentService: PercentService) {}

  @Post()
  create(@Body() createPercentDto: CreatePercentDto) {
    return this.percentService.create(createPercentDto);
  }

  @Get()
  findAll() {
    return this.percentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.percentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePercentDto: UpdatePercentDto) {
    return this.percentService.update(+id, updatePercentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.percentService.remove(+id);
  }
}
