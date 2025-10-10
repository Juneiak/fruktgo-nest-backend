export const OBJECT_STORAGE_PROVIDER = [
  'local',
  'aws-s3',
  'cloudflare-r2',
  'wasabi',
  'backblaze-b2',
  'minio',
] as const;

export type ObjectStorageProvider = typeof OBJECT_STORAGE_PROVIDER[number];