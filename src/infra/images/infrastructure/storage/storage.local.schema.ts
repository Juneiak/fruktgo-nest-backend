import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ImageSize } from '../../images.enums';


@Schema({ _id: false })
export class LocalRef {
  @Prop({ type: String, enum: ['local'], default: 'local' })
  provider!: 'local';

  // «bucket» используем как имя диска/корня (например, 'public'|'private')
  @Prop({ type: String, default: null })
  bucket?: string | null;

  // относительный путь от корня (например, 'images/2025/09/abc.jpg')
  @Prop({ type: String, default: null })
  key?: string | null;

  // для генерации URL (если статика/NGINX/CDN)
  @Prop({ type: String, default: null })
  baseUrl?: string | null; // например, 'https://cdn.domain.com' или '/static'

  @Prop({ type: [String], enum: Object.values(ImageSize), default: [] })
  availableSizes: ImageSize[];

  // тех.метаданные
  @Prop({ type: String, default: null })
  mimeType?: string | null;

  @Prop({ type: Number, default: null })
  bytes?: number | null;

  @Prop({ type: Number, default: null })
  width?: number | null;

  @Prop({ type: Number, default: null })
  height?: number | null;

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