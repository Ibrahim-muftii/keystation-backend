import { Server } from 'socket.io';
import http from 'http';

export const SetupSocket = (app: any) => {
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { 
            origin:'http://localhost:3000',
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    return { server, io };
};
