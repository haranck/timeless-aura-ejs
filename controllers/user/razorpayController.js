const MESSAGES = require("../../constants/messages");
const HTTP_STATUS = require("../../constants/httpStatusCodes");
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const options = {
      amount: amount * 100, // Convert to paisa
      currency,
      receipt: `order_rcptid_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: MESSAGES.FAILED_TO_CREATE_ORDER });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingAddress,
      orderedItems,
      totalAmount,
      couponCode,
      discountAmount,
    } = req.body;

    if (!req.session.user) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.NOT_AUTHENTICATED });
    }
    const userAddress = await Address.findOne({
      userId: req.session.user,
      "address._id": shippingAddress,
    });

    if (!userAddress) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_SHIPPING_ADDRESS });
    }
    const selectedAddress = userAddress.address.find(
      (addr) => addr._id.toString() === shippingAddress,
    );

    console.log("selectedAddress", selectedAddress);

    if (!selectedAddress) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.SELECTED_ADDRESS_NOT_FOUND });
    }

    const parsedOrderItems =
      typeof orderedItems === "string"
        ? JSON.parse(orderedItems)
        : orderedItems;

    const transformedOrderItems = parsedOrderItems.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
    }));

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      const newOrder = new Order({
        user_id: req.session.user,
        address_id: shippingAddress,
        shippingAddress: {
          addressType: selectedAddress.addressType,
          name: selectedAddress.name,
          city: selectedAddress.city,
          landMark: selectedAddress.landMark,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          altPhone: selectedAddress.altPhone,
        },
        payment_method: "razorpay",
        order_items: transformedOrderItems,
        total: totalAmount,
        finalAmount: totalAmount,
        status: "pending",
        paymentStatus: "success",
        couponApplied: couponCode ? true : false,
        discount: discountAmount || 0,
        razorpay_order_id,
        razorpay_payment_id,
      });

      const savedOrder = await newOrder.save();

      let cart = await Cart.findOne({ userId: req.session.user });

      if (!cart) {
        cart = new Cart({
          userId: req.session.user,
          items: [],
          cartTotal: 0,
        });
      } else {
        cart.items = [];
        cart.cartTotal = 0;
      }

      await cart.save();

      orderedItems.forEach(async (item) => {
        await Product.updateOne(
          { _id: item.productId._id },
          { $inc: { quantity: -item.quantity } },
        );
      });

      res.json({
        success: true,
        orderId: savedOrder._id,
      });
    } else {
      const parsedOrderItems =
        typeof orderedItems === "string"
          ? JSON.parse(orderedItems)
          : orderedItems;

      const transformedOrderItems = parsedOrderItems.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
      }));
      console.log("Payment failed: Signature Mismatch");
      const failedOrder = new Order({
        user_id: req.session.user,
        address_id: shippingAddress,
        shippingAddress: {
          addressType: selectedAddress.addressType,
          name: selectedAddress.name,
          city: selectedAddress.city,
          landMark: selectedAddress.landMark,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          altPhone: selectedAddress.altPhone,
        },
        payment_method: "razorpay",
        order_items: transformedOrderItems,
        total: totalAmount,
        finalAmount: totalAmount,
        status: "failed",
        couponApplied: couponCode ? true : false,
        order_items: transformedOrderItems,
        total: totalAmount,
        finalAmount: totalAmount,
        status: "failed",
        couponApplied: couponCode ? true : false,
        discount: discountAmount || 0,
        razorpay_order_id,
      });
      await failedOrder.save();

      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          message: MESSAGES.PAYMENT_VERIFICATION_FAILED,
          orderId: failedOrder._id,
        });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.FAILED_TO_VERIFY_PAYMENT });
  }
};

const paymentFailed = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    let order = await Order.findById(orderId).catch(() => null);

    if (!order) {
      order = await Order.findOne({ razorpay_order_id: orderId });
    }

    if (!order || order.user_id.toString() !== req.session.user) {
      return res.redirect("/orders");
    }

    res.render("failure", { order, user: req.session.userData });
  } catch (error) {
    console.error("Error rendering failure page:", error);
    res.redirect("/orders");
  }
};
const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const failedOrder = await Order.findById(orderId);
    if (!failedOrder || failedOrder.user_id.toString() !== req.session.user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND_OR_NOT_AUTHORIZED });
    }

    if (failedOrder.status !== "failed") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.THIS_ORDER_CANNOT_BE_RETRIED });
    }

    const options = {
      amount: failedOrder.total * 100,
      currency: "INR",
      receipt: `retry_order_${orderId}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Retry Payment Error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.FAILED_TO_RETRY_PAYMENT });
  }
};

const verifyRetryPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (!req.session.user) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.NOT_AUTHENTICATED });
    }

    const failedOrder = await Order.findById(orderId);
    if (!failedOrder) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      failedOrder.status = "pending";
      failedOrder.paymentStatus = "success";
      failedOrder.razorpay_order_id = razorpay_order_id;
      failedOrder.razorpay_payment_id = razorpay_payment_id;
      await failedOrder.save();

      let cart = await Cart.findOne({ userId: req.session.user });

      if (!cart) {
        cart = new Cart({
          userId: req.session.user,
          items: [],
          cartTotal: 0,
        });
      } else {
        cart.items = [];
        cart.cartTotal = 0;
      }

      await cart.save();

      if (failedOrder.order_items && failedOrder.order_items.length > 0) {
        for (const item of failedOrder.order_items) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { quantity: -item.quantity } },
          );
        }
      }

      res.json({
        success: true,
        orderId: failedOrder._id,
      });
    } else {
      console.log("Retry Payment failed: Signature Mismatch");
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.PAYMENT_VERIFICATION_FAILED });
    }
  } catch (error) {
    console.error("Retry Payment Verification Error:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.FAILED_TO_VERIFY_PAYMENT });
  }
};

module.exports = {
  verifyPayment,
  createOrder,
  paymentFailed,
  retryPayment,
  verifyRetryPayment,
};
