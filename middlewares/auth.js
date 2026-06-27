const User = require("../models/userSchema");
const HTTP_STATUS = require("../constants/httpStatusCodes");
const MESSAGES = require("../constants/messages");

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isblocked) {
          console.log(req.session.userData);
          req.session.userData = data;
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((error) => {
        console.log("Error in user auth middlware");
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
      });
  } else {
    res.redirect("/login");
  }
};

const isBlocked = async (req, res, next) => {
  try {
    if (!req.session.user) return next();
    else {
      const user = await User.findById(req.session.user);
      if (user.isblocked) {
        req.session.user = null;
        return res.redirect("/login");
      }
      next();
    }
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/admin/login");
      }
    })
    .catch((error) => {
      console.log("Error in adminAuth middleware", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    });
};

module.exports = {
  userAuth,
  adminAuth,
  isBlocked,
};