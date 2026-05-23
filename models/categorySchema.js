const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  categoryOffer: {
    type: Number,
    default: 0,
  },
  isListed: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
