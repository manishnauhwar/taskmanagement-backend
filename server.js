const express = require('express');
const server = express();
require("dotenv").config();

const connectDB = require('./config/connectDb');
const cors = require('cors');
const TeamAPI = require('./routes/teamRouter');
const UserAPI = require('./routes/userRouter');
const TaskAPI = require('./routes/taskRouter');
const GoogleAuthAPI = require('./routes/googleFbRouter');
const StatAPI = require('./routes/taskstatRouter');

// CORS configuration
server.use(cors({
  origin: process.env.DEV_URL,
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
  res.setHeader('Access-Control-Allow-Origin', process.env.DEV_URL);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

server.options('*', cors());

server.use(express.json());

server.use('/users', UserAPI);
server.use('/tasks', TaskAPI);
server.use('/teams', TeamAPI);
server.use('/stat', StatAPI);
server.use('/', GoogleAuthAPI);

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});
