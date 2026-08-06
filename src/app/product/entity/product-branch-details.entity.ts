export class ProductBranchDetailsEntity {
  id: number;
  branchId: number;
  productId: number;
  price: number;
  stock: number;
  isAvailable: boolean;

  constructor(data: Partial<ProductBranchDetailsEntity>) {
    this.id = data.id!;
    this.branchId = data.branchId!;
    this.productId = data.productId!;
    this.price = data.price!;
    this.stock = data.stock!;
    this.isAvailable = data.isAvailable!;
  }
}
