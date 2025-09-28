import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';


@Schema({ _id: false })
export class BackblazeB2Ref {
  @Prop({ type: String, enum: ['backblaze-b2'], default: 'backblaze-b2' })
  provider!: 'backblaze-b2';

  @Prop({ type: String, required: true })
  bucket!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  region!: string; // напр. us-west-000

  @Prop({ type: String, default: null })
  endpoint?: string | null;

  @Prop({ type: String, default: null })
  versionId?: string | null;
}

export const BackblazeB2RefSchema = SchemaFactory.createForClass(BackblazeB2Ref);