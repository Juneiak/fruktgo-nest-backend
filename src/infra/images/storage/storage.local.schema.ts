import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ImageSize } from '../../images.enums';


@Schema({ _id: false })
export class LocalRef {
  @Prop({ type: String, enum: ['local'], default: 'local' })
  provider!: 'local';

  // «bucket» используем как имя диска/корня (например, 'public'|'private')
  @Prop({ type: String })
  bucket?: string;

  // относительный путь от корня (например, 'images/2025/09/abc.jpg')
  @Prop({ type: String })
  key?: string;

  // для генерации URL (если статика/NGINX/CDN)
  @Prop({ type: String })
  baseUrl?: string;

  @Prop({ type: [String], enum: Object.values(ImageSize), default: [] })
  availableSizes: ImageSize[];

  // тех.метаданные
  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: Number })
  bytes?: number;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  @Prop({ type: String, required: true })
  filename!: string;

  // варианты (готовые ресайзы локально)
  @Prop({
    type: [{
      size:   { type: String, required: true }, // например, 'thumb'|'sm'|'md'
      key:    { type: String, required: true }, // относительный путь варианта
      bytes:  { type: Number },
      width:  { type: Number },
      height: { type: Number },
      eTag:   { type: String },
    }],
    default: [],
  })
  variants?: Array<{ size: string; key: string; bytes?: number; width?: number; height?: number; eTag?: string }>;
}

export const LocalRefSchema = SchemaFactory.createForClass(LocalRef);