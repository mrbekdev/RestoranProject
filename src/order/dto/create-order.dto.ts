export class CreateOrderDto {
  userId: number;
  productIds: number[];
  totalPrice: number;
  tableNumber: string;
  status?: string;
}