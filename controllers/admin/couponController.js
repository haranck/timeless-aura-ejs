const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const Coupon = require("../../models/couponSchema");

const getCouponPage = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 8;
    let skip = (page - 1) * limit;

    const coupons = await Coupon.find()
      .sort({ couponValidity: -1 })
      .skip(skip)
      .limit(limit);
    let totalCoupons = await Coupon.countDocuments();
    let totalPages = Math.ceil(totalCoupons / limit);

    res.render("coupon", { coupons, currentPage: page, totalPages });
  } catch (error) {
    console.log("error in coupon page", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      couponType,
      discount,
      minPurchase,
      maxDiscount,
      expiryDate,
      usageLimit,
    } = req.body;

    if (
      !couponCode ||
      !couponType ||
      !discount ||
      !minPurchase ||
      !expiryDate ||
      !maxDiscount ||
      !usageLimit
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ALL_FIELDS_ARE_REQUIRED,
        missingFields: {
          couponCode: !couponCode,
          couponType: !couponType,
          discount: !discount,
          minPurchase: !minPurchase,
          maxDiscount: !maxDiscount,
          expiryDate: !expiryDate,
          usageLimit: !usageLimit,
        },
      });
    }

    if (couponType !== "percentage") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_COUPON_TYPE_MUST_BE_PERCENTAGE,
      });
    }

    const existingCoupon = await Coupon.findOne({ couponCode });
    if (existingCoupon) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
      });
    }

    const parsedDiscount = parseFloat(discount);
    const parsedMinPurchase = parseFloat(minPurchase);
    const parsedMaxDiscount = parseFloat(maxDiscount);
    const parsedUsageLimit = parseFloat(usageLimit);

    if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.DISCOUNT_MUST_BE_A_POSITIVE_NUMBER,
      });
    }

    if (couponType === "percentage") {
      if (parsedDiscount > 100) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.PERCENTAGE_DISCOUNT_CANNOT_EXCEED_100,
        });
      }
    }
    if (isNaN(parsedMinPurchase) || parsedMinPurchase < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.MINIMUM_PURCHASE_MUST_BE_A_NONNEGATIVE_N,
      });
    }
    if (isNaN(parsedMaxDiscount) || parsedMaxDiscount < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.MAXIMUM_DISCOUNT_MUST_BE_A_NONNEGATIVE_N,
      });
    }

    const parsedExpiryDate = new Date(expiryDate);
    if (parsedExpiryDate < new Date()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.EXPIRY_DATE_MUST_BE_IN_THE_FUTURE,
      });
    }

    if (isNaN(parsedUsageLimit) || parsedUsageLimit <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.USAGE_LIMIT_MUST_BE_A_POSITIVE_NUMBER,
      });
    }

    const newCoupon = new Coupon({
      couponCode,
      couponType,
      couponDiscount: parsedDiscount,
      couponMinAmount: parsedMinPurchase,
      couponMaxAmount: parsedMaxDiscount,
      couponValidity: parsedExpiryDate,
      limit: parsedUsageLimit,
      isActive: true,
    });

    await newCoupon.save();

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.COUPON_ADDED_SUCCESSFULLY,
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Detailed error in add coupon:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      errorDetails: error.message,
    });
  }
};
const toggleCoupon = async (req, res) => {
  try {
    const coupenId = req.params.id;
    const { isActive } = req.body;

    const couponToToggle = await Coupon.findById(coupenId);

    if (!couponToToggle) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.COUPON_NOT_FOUND,
      });
    }
    couponToToggle.isActive = isActive;

    await couponToToggle.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Coupon ${isActive ? "activated" : "inactivated"} successfully`,
      isActive: couponToToggle.isActive,
    });
  } catch (error) {
    console.log("error toggling coupon", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      errorDetails: error.message,
    });
  }
};

module.exports = {
  getCouponPage,
  addCoupon,
  toggleCoupon,
};
