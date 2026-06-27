const HTTP_STATUS = require("../../constants/httpStatusCodes");
const MESSAGES = require("../../constants/messages");
const product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { addCategory } = require("./categoryController");
const Product = require("../../models/productSchema");
const { isBlocked } = require("../../middlewares/auth");
const Brand = require("../../models/brandSchema");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("product-add", { cat: category, brand: brand });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;

    const productExists = await product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            `resized-${req.files[i].filename}`,
          );

          try {
            await sharp(originalImagePath)
              .resize({ width: 440, height: 440 })
              .toFile(resizedImagePath);
            images.push(req.files[i].filename);
          } catch (imgError) {
            console.error("Error processing image:", imgError);
          }
        }
      }

      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        return res.render("product-add", {
          cat: category,
          brand: brand,
          message: MESSAGES.CATEGORY_NOT_FOUND,
        });
      }

      const brandId = await Brand.findOne({ brandName: products.brand });
      if (!brandId) {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        return res.render("product-add", {
          cat: category,
          brand: brand,
          message: MESSAGES.BRAND_NOT_FOUND,
        });
      }

      if (
        !products.productName ||
        !products.description ||
        !products.regularPrice
      ) {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        return res.render("product-add", {
          cat: category,
          brand: brand,
          message: MESSAGES.ALL_REQUIRED_FIELDS_MUST_BE_FILLED,
        });
      }

      if (images.length < 3) {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        return res.render("product-add", {
          cat: category,
          brand: brand,
          message: MESSAGES.AT_LEAST_3_PRODUCT_IMAGES_ARE_REQUIRED,
        });
      }

      const newProduct = new product({
        productName: products.productName,
        description: products.description,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice || products.regularPrice,
        discountPrice: products.discountPrice,
        createdAt: Date.now(),
        productImages: images,
        isListed: products.isListed !== undefined ? products.isListed : true,
        quantity: products.quantity || 0,
        brand: brandId._id,
        status: "available",
      });

      await newProduct.save();
      return res.redirect("/admin/products");
    } else {
      const category = await Category.find({ isListed: true });
      const brand = await Brand.find({ isBlocked: false });
      return res.render("product-add", {
        cat: category,
        brand: brand,
        message: MESSAGES.PRODUCT_ALREADY_EXISTS,
      });
    }
  } catch (error) {
    console.log("Error adding product", error);

    const category = await Category.find({ isListed: true }).catch((e) => []);
    const brand = await Brand.find({ isBlocked: false }).catch((e) => []);

    return res.render("product-add", {
      cat: category,
      brand: brand,
      message: MESSAGES.ERROR_ADDING_PRODUCT + error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = 5;

    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category") // Ensure this matches the schema's `ref` field
      .exec();

    const count = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("products", {
      data: productData,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      cat: category,
      searchTerm: search,
      brand: brand,
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.redirect("/pageerror");
  }
};

const toggleProductList = async (req, res) => {
  try {
    const productId = req.params.id;
    const { isListed } = req.body;

    const productToToggle = await Product.findById(productId);

    if (!productToToggle) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: MESSAGES.PRODUCT_NOT_FOUND,
        success: false,
      });
    }
    productToToggle.isListed = isListed;
    await productToToggle.save({ validateBeforeSave: false });

    res.json({
      message: `Product ${isListed ? "listed" : "unlisted"} successfully`,
      isListed: productToToggle.isListed,
      success: true,
    });
  } catch (error) {
    console.error("Error toggling product list status:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: MESSAGES.FAILED_TO_TOGGLE_PRODUCT_STATUS,
      success: false,
    });
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect("/admin/products");
    }

    const product = await Product.findById(id)
      .populate("category")
      .populate("brand");
    if (!product) {
      return res.redirect("/admin/products");
    }

    const categories = await Category.find({});
    const brand = await Brand.find({});

    res.render("edit-product", {
      product,
      cat: categories,
      brand: brand,
      message: "",
    });
  } catch (error) {
    console.error("Error in getEditProduct:", error);
    res.redirect("/admin/products");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    let deletedImages = [];

    console.log("data", data.brand);

    try {
      deletedImages = data.deletedImages ? JSON.parse(data.deletedImages) : [];
    } catch (error) {
      console.error("Error parsing deletedImages:", error);
    }

    if (
      !data.productName ||
      !data.category ||
      !data.regularPrice ||
      !data.salePrice ||
      !data.brand
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.PRODUCT_NAME_CATEGORY_REGULAR_PRICE_SALE,
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.PRODUCT_NOT_FOUND,
      });
    }

    const regularPrice = parseFloat(data.regularPrice);
    const salePrice = parseFloat(data.salePrice);

    if (
      isNaN(regularPrice) ||
      isNaN(salePrice) ||
      regularPrice <= 0 ||
      salePrice <= 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_PRICE_VALUES,
      });
    }

    // const categoryId = await Category.findOne({ name: data.category });
    const categoryId = await Category.findOne({ _id: data.category });

    if (!categoryId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.CATEGORY_NOT_FOUND,
      });
    }
    const brand = await Brand.findOne({ brandName: data.brand });
    if (!brand) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.BRAND_NOT_FOUND,
      });
    }

    const remainingImages = existingProduct.productImages.filter(
      (image) => !deletedImages.includes(image),
    );

    const newImages = [];
    if (
      req.files &&
      req.files.length > 0 &&
      !Object.keys(data).some((key) => key.startsWith("croppedImage"))
    ) {
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const resizedImagePath = path.join(
          "public",
          "uploads",
          "product-images",
          `resized-${req.files[i].filename}`,
        );

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath);

        newImages.push(`resized-${req.files[i].filename}`);
      }
    }

    const croppedImages = [];
    for (let i = 1; i <= 4; i++) {
      const croppedImageKey = `croppedImage${i}`;
      if (data[croppedImageKey]) {
        const base64Data = data[croppedImageKey].replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `cropped-${Date.now()}-${i}.jpg`;
        const filepath = path.join(
          "public",
          "uploads",
          "product-images",
          filename,
        );

        await fs.promises.writeFile(filepath, buffer);
        croppedImages.push(filename);
      }
    }

    const updatedImages = [...remainingImages, ...newImages, ...croppedImages];

    if (updatedImages.length < 3 || updatedImages.length > 4) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.YOU_MUST_HAVE_BETWEEN_3_AND_4_IMAGES,
      });
    }

    existingProduct.productName = data.productName;
    existingProduct.description = data.description;
    existingProduct.category = categoryId._id;
    existingProduct.brand = brand._id;
    existingProduct.regularPrice = regularPrice;
    existingProduct.salePrice = salePrice;
    existingProduct.quantity = data.quantity;
    existingProduct.size = data.size;
    existingProduct.isListed = data.isListed === "true";
    existingProduct.productImages = updatedImages;

    await existingProduct.save();

    for (const imageName of deletedImages) {
      try {
        const imagePath = path.join(
          "public",
          "uploads",
          "product-images",
          imageName,
        );
        await fs.promises.unlink(imagePath);
      } catch (unlinkError) {
        console.error(`Error deleting image ${imageName}:`, unlinkError);
      }
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.PRODUCT_UPDATED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error editing product:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    const product = await Product.findById(productIdToServer);
    if (!product) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .send({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    const imageRemoved = await Product.findByIdAndUpdate(
      productIdToServer,
      { $pull: { productImages: imageNameToServer } },
      { new: true },
    );

    if (!imageRemoved) {
      console.error("Failed to remove image from product");
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .send({
          status: false,
          message: MESSAGES.FAILED_TO_REMOVE_IMAGE_FROM_PRODUCT,
        });
    }

    console.log("Product images after deletion:", imageRemoved.productImages);

    const imagePaths = [
      path.join("public", "uploads", "re-image", imageNameToServer),
      path.join("public", "uploads", "products", imageNameToServer),
      path.join("uploads", "re-image", imageNameToServer),
      path.join("uploads", "products", imageNameToServer),
    ];

    let imageDeleted = false;
    for (const imagePath of imagePaths) {
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Image ${imageNameToServer} deleted from ${imagePath}`);
          imageDeleted = true;
          break;
        }
      } catch (fileError) {
        console.error(`Error deleting image from ${imagePath}:`, fileError);
      }
    }

    if (!imageDeleted) {
      console.log(
        `Image file ${imageNameToServer} not found in any of the checked paths`,
      );
    }

    res.send({
      status: true,
      message: MESSAGES.IMAGE_DELETED_SUCCESSFULLY,
      remainingImages: imageRemoved.productImages || [],
    });
  } catch (error) {
    console.error("Comprehensive error in deleteSingleImage:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
      status: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      errorDetails: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: false,
        message: MESSAGES.PRODUCT_NOT_FOUND,
      });
    }

    if (product.productImages && product.productImages.length > 0) {
      const fs = require("fs");
      const path = require("path");

      product.productImages.forEach((imageName) => {
        const imagePath = path.join(
          __dirname,
          "../../public/uploads/products",
          imageName,
        );

        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
            console.log(`Deleted image: ${imageName}`);
          } catch (error) {
            console.error(`Error deleting image ${imageName}:`, error);
          }
        }
      });
    }

    await Product.findByIdAndDelete(productId);

    return res.status(HTTP_STATUS.OK).json({
      status: true,
      message: MESSAGES.PRODUCT_DELETED_SUCCESSFULLY,
    });
  } catch (error) {
    console.error("Error deleting product:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      errorDetails:
        process.env.NODE_ENV === "development"
          ? {
              name: error.name,
              stack: error.stack,
            }
          : undefined,
    });
  }
};
const addProductOffer = async (req, res) => {
  try {
    const { productId, offerPercentage, endDate } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        productOffer: offerPercentage,
        //   offerStartDate: startDate,
        offerEndDate: endDate,
      },
      { new: true },
    );

    if (!product) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("Error adding product offer:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_TO_ADD_OFFER });
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        productOffer: 0,
        //   offerStartDate: null,
        offerEndDate: null,
      },
      { new: true },
    );

    if (!product) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("Error deleting product offer:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_TO_DELETE_OFFER });
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  toggleProductList,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  deleteProduct,
  addProductOffer,
  deleteProductOffer,
};
