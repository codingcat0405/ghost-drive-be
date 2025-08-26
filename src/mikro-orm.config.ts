import {defineConfig, PostgreSqlDriver} from '@mikro-orm/postgresql';

export default defineConfig({
  driver: PostgreSqlDriver,
  entities: ['src/entities'],
  clientUrl: process.env.DATABASE_URL,
});
