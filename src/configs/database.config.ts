import { Sequelize } from "sequelize";
import dotenv from 'dotenv'

dotenv.config();


export const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USERNAME as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: process.env.DB_DIALECT as "postgres",
    logging: false,
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();
