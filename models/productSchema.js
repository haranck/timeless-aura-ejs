const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate product names
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    productImages: [
      {
        type: String,
        required: true,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isListed: {
      type: Boolean,
      default: false,
    },
    productOffer: {
      type: Number,
      default: 0,
    },
    offerEndDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["available", "out of stock"],
      required: true,
      default: "available",
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
