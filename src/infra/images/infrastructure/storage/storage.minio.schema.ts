import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';


@Schema({ _id: false })
export class MinioRef {
  @Prop({ type: String, enum: ['minio'], default: 'minio' })
  provider!: 'minio';

  @Prop({ type: String, required: true })
  bucket!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  endpoint!: string;  // http(s)://host:9000

  @Prop({ type: Boolean, default: true })
  forcePathStyle?: boolean;

  @Prop({ type: String, default: null })
  region?: string | null;
}

export const MinioRefSchema = SchemaFactory.createForClass(MinioRef);