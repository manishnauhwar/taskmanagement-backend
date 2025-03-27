const express = require('express');
const server = express();

require("dotenv").config();
const connectDB = require('./config/connectDb');
const cors = require('cors');

const UserAPI = require('./routes/userRouter');
const TaskAPI = require('./routes/taskRouter');

server.use(cors());
server.use(express.json());
server.use('/api/users', UserAPI);
server.use('/api/tasks', TaskAPI);

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
})