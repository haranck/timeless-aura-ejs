const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const {
  getDiscountPrice,
  getDiscountPriceCart,
} = require("../../helpers/offerHelper");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { INFINITY } = require("chart.js/helpers");

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" },
    });

    // if (!cart || cart.items.length === 0) {
    //     return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.CART_IS_EMPTY });
    // }

    const availableItems = cart.items.filter(
      (item) =>
        item.productId.isListed &&
        item.productId.category &&
        item.productId.category.isListed,
    );

    if (availableItems.length !== cart.items.length) {
      req.flash(
        "error",
        "Some products or their categories are unavailable and have been removed from your checkout.",
      );
    }
    cart.items = availableItems;

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0,
    );

    const user = await User.findById(userId);
    const addressDoc = await Address.findOne({ userId: userId });
    let userAddress = addressDoc ? addressDoc.address : [];

    const carttotal = cart.totalPrice;
    const date = new Date();
    const coupon = await Coupon.find({
      couponMinAmount: { $lte: carttotal },
      isActive: true,
      limit: { $gt: 0 },
      couponValidity: { $gte: date },
    });

    res.render("checkout", {
      cart,
      user,
      userAddress,
      coupon,
      messages: req.flash(),
    });
  } catch (error) {
    console.log("Error in checkout:", error);
    res.redirect("/pageNotFound");
  }
};

const editCheckoutAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      address_id,
      name,
      addressType,
      city,
      state,
      landMark,
      pincode,
      phone,
      altPhone,
    } = req.body;

    if (!address_id) {
      console.log("Invalid Address ID:", address_id);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: MESSAGES.INVALID_ADDRESS_ID });
    }

    const address = await Address.findOne({
      userId: userId,
      "address._id": address_id,
    }); // If the user has multiple address it help find curnt indx
    if (!address) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.ADDRESS_NOT_FOUND });
    }

    const addressIndex = address.address.findIndex(
      (addr) => addr._id.toString() === address_id,
    );
    if (addressIndex === -1) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.ADDRESS_NOT_FOUND_IN_ARRAY });
    }

    address.address[addressIndex] = {
      ...address.address[addressIndex],
      name,
      addressType,
      city,
      state,
      landMark,
      pincode,
      phone,
      altPhone,
    };

    await address.save();
    res.redirect("/checkout");
  } catch (error) {
    console.log("error in editCheckoutAddress", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const addCheckoutAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      name,
      addressType,
      city,
      state,
      landMark,
      pincode,
      phone,
      altPhone,
    } = req.body;

    let addressDoc = await Address.findOne({ userId });

    if (addressDoc) {
      addressDoc.address.push({
        name,
        addressType,
        city,
        state,
        landMark,
        pincode,
        phone,
        altPhone,
      });
      await addressDoc.save();
    } else {
      addressDoc = new Address({
        userId,
        address: [
          {
            name,
            addressType,
            city,
            state,
            landMark,
            pincode,
            phone,
            altPhone,
          },
        ],
      });
      await addressDoc.save();
    }

    res.redirect("/checkout");
  } catch (error) {
    console.log("error in addCheckoutAddress", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      shippingAddress,
      paymentMethod,
      totalAmount,
      couponCode,
      discountAmount,
    } = req.body;

    if (totalAmount < 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          error: MESSAGES.SOME_PRODUCTS_ARE_NOT_AVAILABLE_AND_HAVE,
        });
    }

    if (paymentMethod === "cod" && totalAmount > 10000) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          success: false,
          error: MESSAGES.MAXIMUM_ORDER_AMOUNT_FOR_COD_IS_10000,
        });
    }

    const address = await Address.findOne({
      userId,
      "address._id": shippingAddress,
    });

    if (!address) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_SHIPPING_ADDRESS });
    }

    const orderAddress = address.address.find(
      (addr) => addr._id.toString() === shippingAddress,
    );
    const orderedItems = JSON.parse(JSON.stringify(req.body.orderedItems));

    const unavailableItems = [];

    for (const item of orderedItems) {
      const product = await Product.findById(item.productId).populate(
        "category",
      );

      if (!product || !product.isListed) {
        unavailableItems.push({
          id: item.productId,
          name: item.productName || "Unknown product",
          reason: "Product is no longer available",
        });
        continue;
      }

      if (!product.category || !product.category.isListed) {
        unavailableItems.push({
          id: item.productId,
          name: product.productName,
          reason: "Product category is no longer available",
        });
        continue;
      }

      if (product.quantity < item.quantity) {
        unavailableItems.push({
          id: item.productId,
          name: product.productName,
          reason: "Insufficient stock available",
        });
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: MESSAGES.SOME_PRODUCTS_HAVE_BECOME_UNAVAILABLE_SI,
        unavailableItems: unavailableItems,
      });
    }

    let coupon = "";
    if (couponCode) {
      coupon = await Coupon.findOne({ couponCode: couponCode });
      if (!coupon) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, error: MESSAGES.INVALID_COUPON_CODE });
      }
    }

    const cleanedTotal = parseFloat(totalAmount);
    const cleanedDiscount = parseFloat(discountAmount);

    if (isNaN(cleanedTotal)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, error: MESSAGES.INVALID_TOTAL_AMOUNT });
    }

    if (
      !userId ||
      !shippingAddress ||
      !paymentMethod ||
      !totalAmount ||
      !orderedItems
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, error: MESSAGES.PLEASE_FILL_ALL_THE_FIELDS });
    }

    const orderedItemsWithDetails = await Promise.all(
      orderedItems.map(async (item) => {
        const product = await Product.findById(item.productId);

        if (!product) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }

        return {
          productId: product._id,
          quantity: item.quantity,
          price: product.salePrice,
          productName: product.productName,
        };
      }),
    );

    const formattedItems = orderedItemsWithDetails.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      productName: item.productName,
    }));

    const newOrder = new Order({
      user_id: userId,
      address_id: shippingAddress,
      shippingAddress: {
        addressType: orderAddress.addressType,
        name: orderAddress.name,
        city: orderAddress.city,
        landMark: orderAddress.landMark,
        state: orderAddress.state,
        pincode: orderAddress.pincode,
        phone: orderAddress.phone,
        altPhone: orderAddress.altPhone,
      },
      payment_method: paymentMethod,
      finalAmount: cleanedTotal,
      order_items: formattedItems,
      status: "pending",
      total: cleanedTotal,
      couponCode: couponCode || null,
      couponApplied: !!coupon,
      discount: cleanedDiscount,
    });

    if (coupon) {
      await Coupon.findOneAndUpdate(
        { couponCode },
        { $inc: { usageCount: 1 } },
      );
    }

    await newOrder.save();

    for (const item of orderedItems) {
      await Product.updateOne(
        { _id: item.productId._id },
        { $inc: { quantity: -item.quantity } },
      );
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      orderId: newOrder._id,
      message: MESSAGES.ORDER_PLACED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.FAILED_TO_PLACE_ORDER_PLEASE_TRY_AGAIN,
    });
  }
};

const validateCheckoutItems = async (req, res) => {
  try {
    const { orderedItems } = req.body;

    const unavailableItems = [];

    for (const item of orderedItems) {
      const product = await Product.findById(item.productId).populate(
        "category",
      );

      if (!product || !product.isListed) {
        unavailableItems.push({
          id: item.productId,
          name: item.productName || "Unknown product",
          reason: "Product is no longer available",
        });
        continue;
      }

      if (!product.category || !product.category.isListed) {
        unavailableItems.push({
          id: item.productId,
          name: product.productName,
          reason: "Product category is no longer available",
        });
        continue;
      }

      if (product.quantity < item.quantity) {
        unavailableItems.push({
          id: item.productId,
          name: product.productName,
          reason: "Insufficient stock available",
        });
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: MESSAGES.SOME_PRODUCTS_HAVE_BECOME_UNAVAILABLE,
        unavailableItems: unavailableItems,
      });
    }

    return res.json({
      success: true,
      message: MESSAGES.ALL_PRODUCTS_ARE_AVAILABLE,
    });
  } catch (error) {
    console.error("Error validating checkout items:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.FAILED_TO_VALIDATE_ITEMS_PLEASE_TRY_AGAI,
    });
  }
};
const viewOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate({
        path: "order_items.productId",
        select: "productName productImages price ",
      })
      .sort({ createdAt: -1 });

    if (!order) {
      console.log("Order not found in database");
      return res.redirect("/userProfile");
    }

    if (!order.user_id || order.user_id.toString() !== userId.toString()) {
      console.log("Order does not belong to current user");
      return res.redirect("/profile");
    }

    const deliveryAddress = order.shippingAddress || null;

    const orderData = {
      ...order.toObject(),
      address: deliveryAddress,
      totalAmount: order.totalAmount || order.total || order.finalAmount,
      orderStatus: order.status,
      couponApplied: order.couponApplied,
    };

    return res.render("order", {
      order: orderData,
      user: req.session.userData,
    });
  } catch (error) {
    console.error("View order error:", error);
    return res.redirect("/profile");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderReason = req.body.reason;
    const userId = req.session.user;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: MESSAGES.UNAUTHORIZED });
    }

    const order = await Order.findById(orderId);

    if (!orderReason) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.REASON_IS_REQUIRED });
    }
    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.ORDER_NOT_FOUND });
    }
    for (let item of order.order_items) {
      const updatedProduct = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } },
        { new: true },
      );
    }

    order.status = "cancelled";
    await order.save();

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: [],
      });
    }
    console.log("Paymentmethod", order.payment_method);
    console.log("Status", order.status);

    if (order.payment_method !== "cod" && order.status === "cancelled") {
      wallet.balance += order.total;
      wallet.transactions.push({
        type: "credit",
        amount: order.total,
        description: "Refund for cancelled order",
        status: "completed",
      });

      await wallet.save();
    }

    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.ORDER_CANCELLED_SUCCESSFULLY });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
const applyCoupon = async (req, res) => {
  try {
    const { couponCode, subtotal } = req.body;
    const coupon = await Coupon.findOne({ couponCode, isActive: true });
    if (!coupon) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.INVALID_OR_EXPIRED_COUPON });
    }
    const currentDate = new Date();
    if (coupon.couponValidity < currentDate) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.COUPON_HAS_EXPIRED });
    }
    if (coupon.limit <= 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.COUPON_HAS_REACHED_ITS_LIMIT });
    }

    let discount = 0;
    if (coupon.couponType === "percentage") {
      discount = (subtotal * coupon.couponDiscount) / 100;
    } else {
      discount = coupon.couponDiscount;
    }

    if (discount > coupon.couponMaxAmount) {
      discount = coupon.couponMaxAmount;
    }

    let newTotal = subtotal - discount;

    coupon.limit -= 1;

    coupon.usageCount += 1;

    await coupon.save();

    return res
      .status(HTTP_STATUS.OK)
      .json({
        success: true,
        message: MESSAGES.COUPON_APPLIED_SUCCESSFULLY,
        discount,
        newTotal,
      });
  } catch (error) {
    console.log("error applying coupon", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const { couponCode, subtotal } = req.body;
    const coupon = await Coupon.findOne({ couponCode: couponCode });

    if (!coupon) {
      return res.json({ success: false, message: MESSAGES.INVALID_COUPON });
    }

    coupon.limit += 1;
    coupon.usageCount -= 1;
    await coupon.save();

    const cartTotal = subtotal;

    res.json({
      success: true,
      cartTotal,
      message: MESSAGES.COUPON_REMOVED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.SERVER_ERROR_WHILE_REMOVING_COUPON,
    });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).send(MESSAGES.INVALID_ORDER_ID);
    }

    const order = await Order.findById(orderId)
      .populate({
        path: "order_items.productId",
        select: "name price",
      })
      .populate("user_id", "name email mobile");

    const customerName = order.user_id
      ? order.user_id.name || "Customer"
      : "Customer";

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).send(MESSAGES.ORDER_NOT_FOUND);
    }

    const invoiceDir = path.join(__dirname, "../../publics/invoices");
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);
    const writeStream = fs.createWriteStream(invoicePath);

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });
    doc.pipe(writeStream);

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .text("Timeless Aura", { align: "center" })
      .fontSize(16)
      .text("Tax Invoice", { align: "center" })
      .moveDown(1.5);

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Invoice Number: ${order._id}`, { align: "left" })
      .text(`Date of Issue: ${order.createdAt.toLocaleDateString()}`, {
        align: "left",
      })
      .moveDown(1);

    doc
      .font("Helvetica-Bold")
      .text("Billing Details:", { underline: false })
      .moveDown(0.5)
      .font("Helvetica")
      .text(`Customer Name: ${customerName}`, { align: "left" })
      .moveDown(1);
    doc
      .font("Helvetica-Bold")
      .text("Payment Details:", { underline: false })
      .moveDown(1)
      .font("Helvetica")
      .text(`Payment Method: ${order.payment_method}`, { align: "left" })
      .moveDown(0.5)
      .font("Helvetica")
      .text(`Payment Status: ${order.status}`, { align: "left" })
      .moveDown(1);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Order Summary", { underline: false });

    const startX = 50;
    const columnWidths = { product: 250, quantity: 80, price: 80, total: 80 };
    let y = doc.y + 10;

    doc
      .font("Helvetica-Bold")
      .text("Product", startX, y, { width: columnWidths.product })
      .text("Quantity", startX + columnWidths.product, y, {
        width: columnWidths.quantity,
        align: "right",
      })
      .text("Price", startX + columnWidths.product + columnWidths.quantity, y, {
        width: columnWidths.price,
        align: "right",
      })
      .text(
        "Total",
        startX +
          columnWidths.product +
          columnWidths.quantity +
          columnWidths.price,
        y,
        { width: columnWidths.total, align: "right" },
      )
      .moveDown(0.5)
      .moveTo(startX, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    let runningTotal = 0;
    order.order_items.forEach((item) => {
      y = doc.y + 5;
      const itemTotal = item.price * item.quantity;
      runningTotal += itemTotal;

      doc
        .font("Helvetica")
        .text(item.productName, startX, y, { width: columnWidths.product })
        .text(`${item.quantity}`, startX + columnWidths.product, y, {
          width: columnWidths.quantity,
          align: "right",
        })
        .text(
          `RS.${item.price.toFixed(2)}`,
          startX + columnWidths.product + columnWidths.quantity,
          y,
          { width: columnWidths.price, align: "right" },
        )
        .text(
          `RS.${itemTotal.toFixed(2)}`,
          startX +
            columnWidths.product +
            columnWidths.quantity +
            columnWidths.price,
          y,
          { width: columnWidths.total, align: "right" },
        )
        .moveDown(0.5);
    });

    doc
      .moveDown(1)
      .moveTo(startX, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.5);

    const summaryStartY = doc.y;
    const lineHeight = 15;

    doc
      .font("Helvetica-Bold")
      .text("Subtotal", 400, summaryStartY, { width: 100, align: "right" });
    doc
      .font("Helvetica")
      .text(`RS.${runningTotal.toFixed(2)}`, 500, summaryStartY, {
        width: 50,
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .text("Discount", 400, summaryStartY + lineHeight, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica")
      .text(
        `RS.${order.discount.toFixed(2)}`,
        500,
        summaryStartY + lineHeight,
        { width: 50, align: "right" },
      );

    doc
      .font("Helvetica-Bold")
      .text("Delivery Charge", 400, summaryStartY + lineHeight * 2, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica")
      .text("RS.40.00", 500, summaryStartY + lineHeight * 2, {
        width: 50,
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .text("Grand Total", 400, summaryStartY + lineHeight * 3, {
        width: 100,
        align: "right",
      });
    doc
      .font("Helvetica-Bold")
      .text(
        `RS.${runningTotal - order.discount + 40}`,
        500,
        summaryStartY + lineHeight * 3,
        { width: 50, align: "right" },
      );

    doc
      .moveDown(3)
      .font("Helvetica")
      .text("Thanks for choosing Timeless Aura", 50, null, {
        width: 550,
        align: "center",
      })
      .text(
        "Return & Exchange Policy: www.timelessaura.com/return-policy",
        50,
        null,
        { width: 550, align: "center" },
      )
      .moveDown(1)
      .font("Helvetica-Bold")
      .text("Contact Us: 7994102605", 50, null, { width: 550, align: "center" })
      .text("Email: contact@timelessaura.com", 50, null, {
        width: 550,
        align: "center",
      })
      .moveDown(1)
      .font("Helvetica")
      .text("Visit Us: www.timelessaura.com", 50, null, {
        width: 550,
        align: "center",
      });

    doc.end();

    writeStream.on("finish", () => {
      res.download(invoicePath, `invoice-${orderId}.pdf`, (err) => {
        if (err) {
          console.error("Download error:", err);
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.ERROR_DOWNLOADING_INVOICE);
        }
      });
    });
  } catch (error) {
    console.error("Invoice Generation Error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.ERROR_GENERATING_INVOICE);
  }
};

module.exports = {
  loadCheckout,
  editCheckoutAddress,
  addCheckoutAddress,
  placeOrder,
  viewOrder,
  cancelOrder,
  applyCoupon,
  removeCoupon,
  generateInvoice,
  validateCheckoutItems,
};
