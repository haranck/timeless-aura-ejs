const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: Number,
    required: false,
    sparse: true,
    default: null,
  },
  password: {
    type: String,
    required: false,
  },
  isblocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values
    default: null,
  },
  searchHistory: [
    {
      category: {
        type: Schema.Types.ObjectId,
        required: false,
      },
      // brand: {
      //     type: String
      // },
      searchOn: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const User = mongoose.model("User", userSchema);
module.exports = User;
