const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const Category = require("../../models/categorySchema");

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      totalPages: totalPages,
      currentPage: page,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.log("error loading category page", error);
    res.redirect("/pageerror");
  }
};
const addCategory = async (req, res) => {
  const { description, categoryOffer } = req.body;
  const name = req.body.name.trim();

  try {
    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (existingCategory) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.CATEGORY_ALREADY_EXISTS });
    }

    const newCategory = new Category({ name, description, categoryOffer });
    await newCategory.save();
    return res
      .status(HTTP_STATUS.CREATED)
      .json({ success: true, message: MESSAGES.CATEGORY_CREATED_SUCCESSFULLY });
  } catch (error) {
    console.log("error adding category", error);
    throw new Error();
    // return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR })
  }
};

const toggleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.CATEGORY_NOT_FOUND });
    }
    category.isListed = !category.isListed;
    await category.save();
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: MESSAGES.CATEGORY_UPDATED_SUCCESSFULLY });
  } catch (error) {
    console.log("error toggling category", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;

    const category = await Category.findById({ _id: id });

    res.render("edit-category", { category });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription, categoryOffer } = req.body;
    const categoryId = req.params.id;

    if (!categoryName || categoryName.trim().length < 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CATEGORY_NAME_MUST_BE_AT_LEAST_3_CHARACT,
      });
    }

    if (!categoryDescription || categoryDescription.trim().length < 10) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.DESCRIPTION_MUST_BE_AT_LEAST_10_CHARACTE,
      });
    }

    const offer = parseFloat(categoryOffer);
    if (isNaN(offer) || offer < 0 || offer > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CATEGORY_OFFER_MUST_BE_A_NUMBER_BETWEEN,
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${categoryName}$`, "i") },
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.A_CATEGORY_WITH_THIS_NAME_ALREADY_EXISTS,
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        categoryOffer: offer,
      },
      { new: true, runValidators: true },
    );

    if (!updatedCategory) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.CATEGORY_NOT_FOUND,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATEGORY_UPDATED_SUCCESSFULLY,
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Edit Category Error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.AN_ERROR_OCCURRED_WHILE_UPDATING_THE_CAT,
      error: error.message,
    });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  toggleCategory,
  getEditCategory,
  editCategory,
};
