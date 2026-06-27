const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const env = require("dotenv").config();
const db = require("./config/db");
const HTTP_STATUS = require("./constants/httpStatusCodes");
const flash = require("connect-flash");
const nocache = require("nocache");
db();

require("events").EventEmitter.defaultMaxListeners = 20;
// const csrf = require('csurf');
const userRouter = require("./routes/userRouter");
const passport = require("./config/passport");
const adminRouter = require("./routes/adminRouter");

app.use(express.json());
app.use(flash());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: Number(process.env.SESSION_MAX_AGE),
      httpOnly: true,
    },
  }),
);
app.use(nocache());
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);
app.use(express.static(path.join(__dirname, "public")));

app.use("/admin", adminRouter);
app.use("/", userRouter);

app.use("/error", (req, res, next) => {
  throw new Error("Intentional error triggered on /error route");
});

app.use("*", (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).render("error", {
    title: "Oops!",
    message: "The page you're looking for doesn't exist.",
    user: req.session.userData,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error", {
    title: "Oops!",
    message: err.message || "Something went wrong!",
    user: req.session.userData,
  });
});

app.listen(process.env.PORT, () => {
  console.log("Server is running on port 3000");
});
