import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './configs/database.config';

import authenticationRoutes from './router/authentication.router';
import assistantRoutes from './router/assistant.router';
import userRoutes from './router/user.router';
import magentoRoutes from './router/magento.router';

import { runAssocations } from './models/associations';
import { SetupSocket } from './configs/socketIo.config';

dotenv.config();
const app = express();

const { server, io } = SetupSocket(app);

io.on("connection", (socket) => {
    try {
        console.log("🟢 Socket Connected Successfully:", socket.id);

        socket.on("disconnect", () => {
          console.log("🔴 Socket Disconnected:", socket.id);
        });

    } catch (error) {
        console.log("Error : ", error);
    }
});

io.engine.on("connection_error", (err) => {
  console.log("⚠️ Socket connection error:", err.req.url, err.code);
});

app.set('io', io);

app.use(cors({
  origin: [process.env.CLIENT_URL as string],
  credentials: true
}));
app.use(express.json());

app.use('/authentication', authenticationRoutes);
app.use('/assistant', assistantRoutes);
app.use('/user', userRoutes);
app.use('/magento', magentoRoutes);

server.listen(parseInt(process.env.PORT!,10),"0.0.0.0" , async () => {
  console.log(`App listening on port ${process.env.PORT}`);

  try {
    await sequelize.authenticate();
    console.log("✅ DB connected Successfully...");
    await sequelize.sync({ alter: true });
    console.log("🚀 Models in sync....");
    runAssocations();
    console.log("Association Successfully ran");
  } catch (error: any) {
    console.log("❌ Error in the server:", error);
  }
});
