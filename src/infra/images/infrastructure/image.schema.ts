// modules/images/schemas/image.schema.ts
import { Schema as MSchema, Types, Document, PaginateModel, HydratedDocument } from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';

import { ImageAccessLevel, ImageEntityType, ImageType } from '../images.enums';

// базовая подсхема + регистрация дискриминаторов
import {
  StorageRefBase,
  StorageRefBaseSchema,
  registerStorageDiscriminators,
} from './storage'
import { UserType } from 'src/common/enums/common.enum';


export const AllowedUserSchema = {
  userId: { type: String, required: true },
  role: { type: String, required: true, enum: Object.values(UserType) },
  _id: false,
};
export interface AllowedUser {
  userId: string;
  role: string;
};


@Schema({
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
  timestamps: true,
})
export class Image extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  imageId: string;

  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: String, default: null })
  originalFilename: string | null;

  @Prop({ type: String, enum: Object.values(ImageAccessLevel), default: ImageAccessLevel.PRIVATE })
  accessLevel: ImageAccessLevel;

  @Prop({ type: String, enum: Object.values(ImageEntityType), default: null })
  entityType: ImageEntityType | null;

  @Prop({ type: Types.ObjectId, default: null })
  entityId: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ImageType), default: null })
  imageType: ImageType | null;

  @Prop({ type: [AllowedUserSchema], default: [] })
  allowedUsers: AllowedUser[];

  // ЕДИНОЕ поле хранилища (discriminators: local/aws-s3/r2/wasabi/b2/minio)
  @Prop({ type: StorageRefBaseSchema, required: true })
  storage!: StorageRefBase;
}

export const ImageSchema = SchemaFactory.createForClass(Image);

// плагины
ImageSchema.plugin(mongooseLeanVirtuals as any);
ImageSchema.plugin(mongoosePaginate);

// виртуалы
ImageSchema.virtual('imageId').get(function (this: Image): string {
  return this._id.toString();
});

// регистрация embedded discriminators для storage
registerStorageDiscriminators(ImageSchema as unknown as MSchema);

// индексы
ImageSchema.index({ 'storage.provider': 1 });
ImageSchema.index({ 'storage.bucket': 1, 'storage.key': 1 }, { unique: true });
ImageSchema.index({ entityType: 1, entityId: 1, imageType: 1 });

export type ImageDocument = HydratedDocument<Image>;
export type ImageModel = PaginateModel<ImageDocument>;