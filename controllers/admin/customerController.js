const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search; //backendil llath access  cheyth serchik vekknnu
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 5;
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec(); // chain of promise combine cheyunnu

    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render("customers", {
      data: userData,
      totalPages: totalPages,
      currentPage: page,
      search: search,
    });
  } catch (error) {
    console.error("Error in customerInfo:", error);
    res.redirect("/pageerror");
  }
};

const toggleBlock = async (req, res) => {
  try {
    const { id, isBlocked } = req.body;
    await User.updateOne({ _id: id }, { $set: { isblocked: isBlocked } });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  customerInfo,
  toggleBlock,
};
