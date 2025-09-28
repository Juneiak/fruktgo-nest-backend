// application/seller.facade.ts
import { Injectable } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesPort } from './images.port';
import { FindSellerQuery, FindSellersQuery } from './images.queries';
import { UpdateSellerCommand } from './images.commands';
import { Seller } from '../seller.schema';
import { PaginateResult } from 'mongoose';

@Injectable()
export class ImagesFacade implements ImagesPort {
  constructor(private readonly imagesService: ImagesService) {}


}