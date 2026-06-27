const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");

const addMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: MESSAGES.UNAUTHORIZED });
    }

    let wallet = await Wallet.findOne({ userId: userId });

    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
        transactions: [],
      });
    }

    wallet.balance += Number(amount);
    wallet.transactions.push({
      type: "credit",
      amount: Number(amount),
      description: "Wallet Recharge",
    });
    await wallet.save();
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.MONEY_ADDED_SUCCESSFULLY });
  } catch (error) {
    console.log("error in add money", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { reason } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: MESSAGES.UNAUTHORIZED });
    }
    if (!reason) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.RETURN_REASON_IS_REQUIRED });
    }

    const order = await Order.findById(orderId);
    if (!order || order.status !== "delivered") {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.INVALID_ORDER });
    }

    if (order.status !== "delivered") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          message: MESSAGES.ONLY_DELIVERED_ORDERS_CAN_BE_RETURNED,
        });
    }

    order.status = "Return requested";
    order.returnReason = reason;
    await order.save();

    return res
      .status(HTTP_STATUS.OK)
      .json({
        success: true,
        message: MESSAGES.PRODUCT_RETURN_REQUEST_SENDED_UPDATE_STA,
      });
  } catch (error) {
    console.log("error in return order", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  addMoney,
  returnOrder,
};
