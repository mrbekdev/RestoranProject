export class CreateOrderDto {
  userId?: number;
  tableId?: number;
  carrierNumber?: string;
  status?: string;
  products: { productId: number; count: number }[];
  uslug?: number;
}