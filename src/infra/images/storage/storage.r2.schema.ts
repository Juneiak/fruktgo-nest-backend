import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';


@Schema({ _id: false })
export class CloudflareR2Ref {
  @Prop({ type: String, enum: ['cloudflare-r2'], default: 'cloudflare-r2' })
  provider!: 'cloudflare-r2';

  @Prop({ type: String, required: true })
  bucket!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  endpoint!: string; // https://<account>.r2.cloudflarestorage.com

  @Prop({ type: Boolean, default: true })
  forcePathStyle?: boolean;

  @Prop({ type: String, default: null })
  region?: string | null;
}

export const CloudflareR2RefSchema = SchemaFactory.createForClass(CloudflareR2Ref);