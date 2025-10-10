import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { OBJECT_STORAGE_PROVIDER, ObjectStorageProvider } from './object-storage.providers';


@Schema({ _id: false, discriminatorKey: 'provider' })
export class StorageRefBase {
  @Prop({ type: String, enum: OBJECT_STORAGE_PROVIDER, required: true })
  provider!: ObjectStorageProvider;

  @Prop({ type: String, required: true })
  bucket!: string; // для local можно использовать «корневой каталог/диск» (напр. 'public'|'private')

  @Prop({ type: String, required: true })
  key!: string;    // единый «путь»: для S3 — key в бакете; для local — относительный путь от корня

  @Prop({ type: String, default: null })
  region?: string | null;

  @Prop({ type: String, default: null })
  endpoint?: string | null;

  @Prop({ type: String, default: null })
  versionId?: string | null;

  @Prop({ type: String, default: null })
  eTag?: string | null;

  @Prop({ type: Boolean, default: false })
  forcePathStyle?: boolean;

  @Prop({ type: Map, of: String, default: null })
  metadata?: Record<string,string> | null;
}

export const StorageRefBaseSchema = SchemaFactory.createForClass(StorageRefBase);