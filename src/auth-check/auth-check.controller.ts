import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, HttpCode } from '@nestjs/common';
import { AuthCheckService } from './auth-check.service';
import { CreateAuthCheckDto, UpdateAuthCheckDto } from './dto/create-auth-check.dto';
import { AuthCheck } from './entities/auth-check.entity';

@Controller('auth-check')
export class AuthCheckController {
  constructor(private readonly authCheckService: AuthCheckService) {}

  @Post()
  create(@Body() createAuthCheckDto: CreateAuthCheckDto){
    return this.authCheckService.create(createAuthCheckDto);
  }

  @Get()
  findAll(){
    return this.authCheckService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authCheckService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuthCheckDto: UpdateAuthCheckDto,
  ) {
    return this.authCheckService.update(id, updateAuthCheckDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number){
    return this.authCheckService.remove(id);
  }
}