// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { OrderModule } from './order/order.module';
import { AuthModule } from './auth/auth.module';
import { TableModule } from './table/table.module';
import { OrderGateway } from './order/order.gateway';
import { PercentModule } from './percent/percent.module';

@Module({
  imports: [
    ProductModule,
    UserModule,
    CategoryModule,
    AuthModule,
    OrderModule,
    TableModule,
    PercentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
