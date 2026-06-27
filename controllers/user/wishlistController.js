const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const {
  getDiscountPrice,
  getDiscountPriceCart,
} = require("../../helpers/offerHelper");

const loadWishlist = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 5;
    const userId = req.session.user;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" },
    });

    if (!wishlist || wishlist.items.length === 0) {
      return res.render("wishlist", {
        user: req.session.userData,
        wishlist: [],
        currentPage: 1,
        totalPages: 0,
      });
    }

    const processedItems = wishlist.items.map((item) => ({
      ...item.toObject(),
      productId: getDiscountPriceCart(item.productId),
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = processedItems.slice(startIndex, endIndex);

    const totalItems = processedItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    res.render("wishlist", {
      user: req.session.userData,
      wishlist: { ...wishlist.toObject(), items: paginatedItems },
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
    });
  } catch (error) {
    console.error("Error in load wishlist:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/userProfile");
  }
};
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.USER_NOT_LOGGED_IN });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId: userId, items: [] });
    }

    const cart = await Cart.findOne({ userId, "items.productId": productId });

    if (cart) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.ITEM_IS_ALREADY_IN_THE_CART });
    }

    const existingItemIndex = wishlist.items.findIndex(
      (item) => item.productId.toString() === productId,
    );
    if (existingItemIndex !== -1) {
      return res
        .status(HTTP_STATUS.OK)
        .json({ success: false, message: MESSAGES.ITEM_ALREADY_IN_WISHLIST });
    }

    wishlist.items.push({ productId });

    await wishlist.save();

    res.status(HTTP_STATUS.OK).json({ success: true, message: MESSAGES.ADDED_TO_WISHLIST });
  } catch (error) {
    console.log("error in add to wishlist", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const removeWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.productId;
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true },
    ).populate("items.productId");

    if (!wishlist) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.WISHLIST_NOT_FOUND });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, message: MESSAGES.REMOVED_FROM_WISHLIST });
  } catch (error) {
    console.log("error in remove wishlist item", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeWishlistItem,
};
