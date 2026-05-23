const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth, adminAuth, isBlocked } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const wishlistController = require("../controllers/user/wishlistController");
const walletController = require("../controllers/user/walletController");
const razorpayController = require("../controllers/user/razorpayController");

router.get("/", isBlocked, userController.loadHompage);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//shoopp

router.get("/shop", userController.loadShoppingPage);
router.post("/filter", userController.filterProducts);

//product management

router.get("/productDetails", userAuth, productController.productDetails);

//google auth

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.session.passport.user;
    res.redirect("/");
  },
);

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//profile mgt

router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendtOTP);
router.post("/reset-password", profileController.postNewPassword);

router.get("/userProfile", userAuth, profileController.userProfile);
router.post("/update-profile", userAuth, profileController.updateProfile);
router.get("/change-password", userAuth, profileController.changePassword);
router.post(
  "/verify-current-password",
  userAuth,
  profileController.verifyCurrentPassword,
);
router.post("/update-password", userAuth, profileController.updatePassword);

//address management

router.get("/addAddress", userAuth, profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get("/address", userAuth, profileController.getAllAddresses);
// router.get("/editAddress", userAuth, profileController.editAddress)
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.post("/deleteAddress", userAuth, profileController.deleteAddress);

// Cart Management
router.get("/cart", userAuth, cartController.loadCart);
router.post("/addToCart", cartController.addToCart);
router.delete("/cart/remove/:productId", cartController.removeCartItem);

//checkout management
router.get("/checkout", userAuth, isBlocked, checkoutController.loadCheckout);
router.post("/checkout", userAuth, checkoutController.placeOrder);
router.post(
  "/editCheckoutAddress",
  userAuth,
  checkoutController.editCheckoutAddress,
);
router.post(
  "/addCheckoutAddress",
  userAuth,
  checkoutController.addCheckoutAddress,
);
router.get("/viewOrder/:orderId", userAuth, checkoutController.viewOrder);
router.patch("/cancelOrder/:orderId", userAuth, checkoutController.cancelOrder);
router.get("/invoice/:id", userAuth, checkoutController.generateInvoice);
router.post(
  "/validateCheckoutItems",
  userAuth,
  checkoutController.validateCheckoutItems,
);

router.post("/applyCoupon", userAuth, checkoutController.applyCoupon);
router.post("/removeCoupon", userAuth, checkoutController.removeCoupon);

//wishlist management
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.delete(
  "/wishlist/remove/:productId",
  userAuth,
  wishlistController.removeWishlistItem,
);

//wallet management
router.post("/addMoney", userAuth, walletController.addMoney);
router.post("/returnOrder/:orderId", userAuth, walletController.returnOrder);

//razorpay
router.post("/createOrder", userAuth, razorpayController.createOrder);
router.post("/verifyPayment", userAuth, razorpayController.verifyPayment);
router.post(
  "/retryPayment/:orderId",
  userAuth,
  razorpayController.retryPayment,
);
router.get(
  "/paymentFailed/:orderId",
  userAuth,
  razorpayController.paymentFailed,
);
router.post(
  "/verifyRetryPayment",
  userAuth,
  razorpayController.verifyRetryPayment,
);

module.exports = router;
