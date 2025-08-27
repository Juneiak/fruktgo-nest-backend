import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserType } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum EntityType {
  product = 'product',
  shop = 'shop',
  customer = 'customer',
  shopProduct = 'shopProduct',
  employee = 'employee',
  seller = 'seller',
  article = 'article',
};

export enum ImageType {
  productCardImage = 'productCardImage',
  sellerLogo = 'sellerLogo',
  shopProductImage = 'shopProductImage',
  articleImage = 'articleImage',
  shopImage = 'shopImage'
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class UploadedFile extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  imageId: string;

  @Prop({ type: String, required: true })
  filename: string;
  
  @Prop({ enum: ['public', 'private', 'restricted'], default: 'private' })
  accessLevel: 'public' | 'private' | 'restricted';
  
  @Prop({ type: String, enum: EntityType, required: false, default: null })
  entityType: EntityType | null;
  
  @Prop({ type: Types.ObjectId, required: false, default: null })
  entityId: Types.ObjectId | null;

  @Prop({ type: String, enum: ImageType, default: null })
  imageType: ImageType | null;
  
  @Prop({ type: [{ 
    userId: { type: Types.ObjectId }, 
    role: { type: String }
  }], default: [] })
  allowedUsers: { userId: Types.ObjectId, role: string }[];
}

export const UploadedFileSchema = SchemaFactory.createForClass(UploadedFile);
UploadedFileSchema.plugin(mongooseLeanVirtuals as any);

UploadedFileSchema.virtual('imageId').get(function (this: UploadedFile): string {
  return this._id.toString();
});
