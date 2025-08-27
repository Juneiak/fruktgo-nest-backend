import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet: MongoMemoryReplSet;

export const rootMongooseTestModule = () =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      // Создаем in-memory реплика-сет с 1 нодой
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          // WiredTiger требуется для поддержки транзакций
          storageEngine: 'wiredTiger',
          // Количество нод в реплика-сете. Для тестов обычно достаточно одной.
          count: 1,
        },
      });
      const uri = replSet.getUri();
      console.log('Using in-memory MongoDB ReplSet at URI:', uri);
      return { uri };
    },
  });

export const closeMongoConnection = async () => {
  if (replSet) await replSet.stop();
};