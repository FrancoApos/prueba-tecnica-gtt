import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFileSync } from 'node:fs';

const mongod = await MongoMemoryServer.create({ instance: { dbName: 'chat-app' } });
const uri = mongod.getUri('chat-app');
writeFileSync('./mongo-uri.txt', uri);
console.log('MONGO_URI=' + uri);
