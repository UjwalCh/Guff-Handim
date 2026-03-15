const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || 'sqlite';

const commonConfig = {
  logging: false,
  define: {
    timestamps: true,
    underscored: false,
  },
};

const sequelize = dialect === 'sqlite'
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.SQLITE_STORAGE || './dev.sqlite',
      ...commonConfig,
    })
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
