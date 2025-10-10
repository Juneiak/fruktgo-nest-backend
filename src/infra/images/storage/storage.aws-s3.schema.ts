import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';


@Schema({ _id: false })
export class AwsS3Ref {
  @Prop({ type: String, enum: ['aws-s3'], default: 'aws-s3' })
  provider!: 'aws-s3';

  @Prop({ type: String, required: true })
  bucket!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  region!: string;
  
  @Prop({ type: String, default: null })
  versionId?: string | null;

  @Prop({ type: String, default: null })
  eTag?: string | null;
}

export const AwsS3RefSchema = SchemaFactory.createForClass(AwsS3Ref);