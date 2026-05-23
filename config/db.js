const mongoose = require("mongoose");
const env = require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MongoDB_URI);
    console.log("Db connected");
  } catch (error) {
    console.log("Db connection failed");
    process.exit(1);
  }
};
module.exports = connectDB;
