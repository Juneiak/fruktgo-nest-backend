import { Schema } from 'mongoose';
import { LocalRefSchema } from './storage.local.schema';
import { AwsS3RefSchema } from './storage.aws-s3.schema';
import { CloudflareR2RefSchema } from './storage.r2.schema';
import { WasabiRefSchema } from './storage.wasabi.schema';
import { BackblazeB2RefSchema } from './storage.b2.schema';
import { MinioRefSchema } from './storage.minio.schema';


export * from './object-storage.providers';
export { StorageRefBaseSchema, StorageRefBase } from './storage.base.schema';

export function registerStorageDiscriminators(imageSchema: Schema) {
  const sub = imageSchema.path('storage') as any;
  sub.discriminator('local', LocalRefSchema);
  sub.discriminator('aws-s3', AwsS3RefSchema);
  sub.discriminator('cloudflare-r2', CloudflareR2RefSchema);
  sub.discriminator('wasabi', WasabiRefSchema);
  sub.discriminator('backblaze-b2', BackblazeB2RefSchema);
  sub.discriminator('minio', MinioRefSchema);
}