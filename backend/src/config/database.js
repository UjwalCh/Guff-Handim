const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || 'sqlite';
const normalizedDialect = dialect.toLowerCase();
const isPostgres = normalizedDialect === 'postgres' || normalizedDialect === 'postgresql';
const dbSslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const commonConfig = {
  logging: false,
  define: {
    timestamps: true,
    underscored: false,
  },
};

const sequelize = normalizedDialect === 'sqlite'
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || './dev.sqlite',
      ...commonConfig,
    })
  : isPostgres
    ? new Sequelize(
        process.env.DATABASE_URL || {
          database: process.env.DB_NAME || 'securechat',
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
        },
        {
          dialect: 'postgres',
          pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
          dialectOptions: dbSslEnabled
            ? {
                ssl: {
                  require: true,
                  rejectUnauthorized: false,
                },
              }
            : {},
          ...commonConfig,
        }
      )
    : new Sequelize(
        process.env.DB_NAME || 'securechat',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          dialect: 'mysql',
          pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
          dialectOptions: { charset: 'utf8mb4' },
          ...commonConfig,
        }
      );

module.exports = { sequelize };
