const express = require('express');
const server = express();
require("dotenv").config();

const connectDB = require('./config/connectDb');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const TeamAPI = require('./routes/teamRouter');
const UserAPI = require('./routes/userRouter');
const TaskAPI = require('./routes/taskRouter');

const GoogleAuthAPI = require('./routes/googleFbRouter');

const StatAPI = require('./routes/taskstatRouter');

server.use(cors({
  origin: process.env.PRO_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

server.options('*', cors());
// const corsOptions = {
//   origin: [process.env.DEV_URL],
//   methods: "GET,POST,PUT,DELETE",
//   allowedHeaders: "Content-Type,Authorization",
//   credentials: true,
// };
// server.use(cors({origin: "*"}));

server.use(express.json());
server.use(cookieParser());

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
