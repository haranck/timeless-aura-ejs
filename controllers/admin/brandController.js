const MESSAGES = require("../../constants/messages");
const HTTP_STATUS = require("../../constants/httpStatusCodes");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reversedBrand = brandData.reverse();

    res.render("brands", {
      data: reversedBrand,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const addBrand = async (req, res) => {
  try {
    const brand = req.body.name.trim();
    console.log("Brand name:", brand);

    const findBrand = await Brand.findOne({
      brandName: { $regex: `^${brand}$`, $options: "i" },
    });
    if (findBrand) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BRAND_ALREADY_EXISTS });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.PLEASE_UPLOAD_A_BRAND_IMAGE });
    }

    const image = req.files[0].filename;
    console.log("Image:", image);

    const newBrand = new Brand({ brandName: brand, brandImage: image });
    await newBrand.save();

    res.json({
      success: true,
      message: MESSAGES.BRAND_ADDED_SUCCESSFULLY,
      brand: {
        _id: newBrand._id,
        brandName: newBrand.brandName,
        brandImage: newBrand.brandImage,
        isBlocked: false,
      },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN,
      });
  }
};

const blockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.BRAND_BLOCKED_SUCCESSFULLY });
  } catch (error) {
    console.log("error in block brand", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN,
      });
  }
};

const unblockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.BRAND_UNBLOCKED_SUCCESSFULLY });
  } catch (error) {
    console.log("error in unblock brand", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN,
      });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.BRAND_NOT_FOUND });
    }
    await Brand.deleteOne({ _id: id });
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.BRAND_DELETED_SUCCESSFULLY });
  } catch (error) {
    console.log("error in delete brand", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN,
      });
  }
};

module.exports = {
  getBrandPage,
  addBrand,
  blockBrand,
  unblockBrand,
  deleteBrand,
};
