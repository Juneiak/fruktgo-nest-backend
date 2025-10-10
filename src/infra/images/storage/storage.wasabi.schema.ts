import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';


@Schema({ _id: false })
export class WasabiRef {
  @Prop({ type: String, enum: ['wasabi'], default: 'wasabi' })
  provider!: 'wasabi';

  @Prop({ type: String, required: true })
  bucket!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true }) 
  region!: string; // напр. eu-central-1

  @Prop({ type: String, default: null })
  endpoint?: string | null; // опционально override

  @Prop({ type: String, default: null })
  versionId?: string | null;

  @Prop({ type: String, default: null })
  eTag?: string | null;
}

export const WasabiRefSchema = SchemaFactory.createForClass(WasabiRef);