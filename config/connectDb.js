const mongoose = require("mongoose");
require('dotenv').config();

const connectDB= async() => {
try{
  const res = await mongoose.connect(`${process.env.MONGODB_URI}`);
 
if(res)
{
  console.log('MongoDB Connected...');
}
} catch (error) {
  console.error(error.message);
}

};
module.exports = connectDB;