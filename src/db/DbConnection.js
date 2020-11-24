// @flow
import dotenv from 'dotenv';
import {
  ConnectionOptions,
  createConnection,
} from 'typeorm';

// All entities
import Base from '../models/Base';
import Draft from '../models/Draft';
import Poll from '../models/Poll';
import Group from '../models/Group';
import User from '../models/User';
import UserSession from '../models/UserSession';

dotenv.config(); // establish env variables
const isProduction = process.env.NODE_ENV === 'production';

const entities = [
  Base,
  Draft,
  Poll,
  Group,
  User,
  UserSession,
];

// Setup options
const connectionOptions: ConnectionOptions = {
  synchronize: !isProduction,
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    ssl: Object.prototype.hasOwnProperty.call(process.env, 'DB_SSL'),
  },
  entities,
  migrations: [],
  cli: {
    entitiesDir: 'src/models',
    migrationsDir: 'src/db/migrations',
  },
};

const dbConnection = (): Promise<any> => createConnection(connectionOptions)
  .then(async (connection) => {
    console.log('DB Connection options:');
    console.log(process.env.DB_NAME);
    if (isProduction) await connection.runMigrations();
  });
export default dbConnection;
