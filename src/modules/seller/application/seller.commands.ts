

export class UpdateSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly companyName?: string,
    public readonly inn?: string,
    public readonly sellerLogo?: Express.Multer.File,
  ) {}
}