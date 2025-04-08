const express = require('express');
const server = express();
const http = require('http');
const path = require('path');
require("dotenv").config();

const connectDB = require('./config/connectDb');
const cors = require('cors');
const TeamAPI = require('./routes/teamRouter');
const UserAPI = require('./routes/userRouter');
const TaskAPI = require('./routes/taskRouter');
const GoogleAuthAPI = require('./routes/googleFbRouter');
const StatAPI = require('./routes/taskstatRouter');
const NotificationAPI = require('./routes/notificationRouter');
const { initializeSocket } = require('./config/socket');
const User = require('./models/userModel');

const httpServer = http.createServer(server);

initializeSocket(httpServer);

server.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', process.env.DEV_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

server.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

server.options('*', cors());

server.use(express.json());

server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// server.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   next();
// });

server.use('/users', UserAPI);
server.use('/tasks', TaskAPI);
server.use('/teams', TeamAPI);
server.use('/stat', StatAPI);
server.use('/notifications', NotificationAPI);
server.use('/', GoogleAuthAPI);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  try {
    await connectDB();

    const UserModel = require('./models/userModel');
    await UserModel.resetCollection();

    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error('Error starting server:', error);
  }
});
