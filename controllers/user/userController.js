const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const { getDiscountPrice } = require("../../helpers/offerHelper");
const Wallet = require("../../models/walletSchema");

const loadHompage = async (req, res) => {
  try {
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });
    let productData = await Product.find({
      isListed: true,
      category: { $in: categories.map((category) => category._id) },
      brand: { $in: brands.map((brand) => brand._id) },
      quantity: { $gt: 0 },
    })
      .populate("category")
      .populate("brand")
      .sort({ createdOn: -1 })
      .limit(8);

    const processedProducts = productData.map(getDiscountPrice);
    let walletBalance = 0;

    if (user) {
      const userData = await User.findById(user);
      const wallet = await Wallet.findOne({ userId: user });
      if (wallet) {
        walletBalance = wallet.balance;
      }

      return res.render("home", {
        user: userData,
        products: processedProducts,
        brands: brands,
        wallet: walletBalance,
      });
    } else {
      return res.render("home", {
        products: processedProducts,
        brands: brands,
        wallet: walletBalance,
      });
    }
  } catch (error) {
    console.log("error loading home page");
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("error loading signup page");
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Email Verification",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP is ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email:", error);
    return false;
  }
}

const signup = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.render("signup", {
        message: MESSAGES.USER_ALREADY_EXISTS_WITH_THIS_EMAIL,
      });
    }
    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email not sent");
    }
    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };
    res.render("verify-otp");
    console.log("otp sent", otp);
  } catch (error) {
    console.log("Error saving user:", error);
    throw new Error();
  }
};

const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  try {
    if (!req.session.userOtp || !req.session.userData) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.SESSION_EXPIRED_PLEASE_TRY_AGAIN,
      });
    }

    if (otp.toString() === req.session.userOtp.toString()) {
      const { name, phone, email, password } = req.session.userData;
      const hashedPassword = await bcrypt.hash(password, 10);

      const saveUserData = new User({
        name: name,
        email: email,
        phone: phone,
        password: hashedPassword,
      });

      await saveUserData.save();

      delete req.session.userOtp;
      delete req.session.userData;

      return res.json({
        success: true,
        message: MESSAGES.EMAIL_VERIFIED_SUCCESSFULLY,
        redirectUrl: "/login",
      });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_OTP_PLEASE_TRY_AGAIN,
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.AN_ERROR_OCCURRED_PLEASE_TRY_AGAIN_1,
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.SESSION_EXPIRED_PLEASE_TRY_AGAIN,
      });
    }

    const { email } = req.session.userData;
    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      req.session.userOtp = otp;
      console.log("New OTP sent:", otp);
      return res.json({
        success: true,
        message: MESSAGES.OTP_SENT_SUCCESSFULLY,
      });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.FAILED_TO_SEND_OTP_PLEASE_TRY_AGAIN,
      });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.AN_ERROR_OCCURRED_PLEASE_TRY_AGAIN_1,
    });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    res.redirect("/signup");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ email: email });
    if (!findUser) {
      return res.render("login", { message: MESSAGES.USER_NOT_FOUND });
    }
    if (findUser.isblocked) {
      return res.render("login", { message: MESSAGES.USER_IS_BLOCKED });
    }
    if (findUser.isAdmin) {
      return res.render("login", { message: MESSAGES.ADMIN_LOGIN_NOT_ALLOWED });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: MESSAGES.PASSWORD_DOES_NOT_MATCH });
    }
    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.log("error login user", error);
    res.render("login", { message: MESSAGES.LOGIN_FAILED });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session destruction error", err);
        return res.redirect("/");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error", error);
    res.redirect("/pageNotFound");
  }
};

const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    const userData = await User.findOne({ _id: user });
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const query = {
      isListed: true,
      quantity: { $gt: 0 },
    };

    const products = await Product.find(query)
      .populate("category")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const processedProducts = products.map(getDiscountPrice);

    const totalProducts = await Product.countDocuments({
      isListed: true,
      quantity: { $gt: 0 },
    });

    const totalPages = Math.ceil(totalProducts / limit);
    const categoriesWithIds = categories.map((category) => ({
      _id: category._id.toString(),
      name: category.name,
      description: category.description,
    }));
    const brandsWithIds = brands.map((brand) => ({
      _id: brand._id.toString(),
      brandName: brand.brandName,
      brandImage: brand.brandImage,
    }));
    let walletBalance = 0;

    if (user) {
      const wallet = await Wallet.findOne({ userId: user });
      if (wallet) {
        walletBalance = wallet.balance;
      }
    }

    res.render("shop", {
      user: userData,
      products: processedProducts,
      categories: categoriesWithIds,
      brands: brandsWithIds,
      category: categories,
      brand: brands,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      wallet: walletBalance,
    });
  } catch (error) {
    console.log("load Shop Page error", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error", { message: MESSAGES.FAILED_TO_LOAD_SHOP_PAGE });
  }
};

const filterProducts = async (req, res) => {
  try {
    const { categories, priceRange, searchQuery, sortBy, page = 1 } = req.body;
    const limit = 12;
    const skip = (page - 1) * limit;

    let filter = {
      isListed: true,
      quantity: { $gt: 0 },
    };

    const listedCategories = await Category.find({ isListed: true }).lean();
    const listedBrands = await Brand.find({ isBlocked: false }).lean();

    if (categories && categories.length > 0) {
      const filteredCategories = listedCategories.filter((cat) =>
        categories.includes(cat._id.toString()),
      );
      filter.category = {
        $in: filteredCategories.map((cat) => cat._id),
        $ne: null,
      };
    }

    if (req.body.brands && req.body.brands.length > 0) {
      const filteredBrands = listedBrands.filter((brand) =>
        req.body.brands.includes(brand._id.toString()),
      );
      filter.brand = {
        $in: filteredBrands.map((brand) => brand._id),
        $ne: null,
      };
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      filter.salePrice = max ? { $gte: min, $lte: max } : { $gte: min };
    }

    if (searchQuery) {
      filter.productName = { $regex: searchQuery, $options: "i" };
    }

    let query = Product.find(filter)
      .populate("category")
      .skip(skip)
      .limit(limit);

    if (sortBy) {
      switch (sortBy) {
        case "price-low-high":
          query = query.sort({ salePrice: 1 });
          break;
        case "price-high-low":
          query = query.sort({ salePrice: -1 });
          break;
        case "new-arrivals":
          query = query.sort({ createdAt: -1 });
          break;
        case "a-z":
          query = query.sort({ productName: 1 });
          break;
        case "z-a":
          query = query.sort({ productName: -1 });
          break;
      }
    }

    const products = await query.exec();
    const processedProducts = products.map(getDiscountPrice);
    const totalProducts = await Product.countDocuments(filter);

    res.json({
      success: true,
      products: processedProducts,
      totalProducts: totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  } catch (error) {
    console.log("error filtering products", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  loadHompage,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadShoppingPage,
  filterProducts,
};
