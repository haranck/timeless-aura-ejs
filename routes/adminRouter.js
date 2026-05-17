const express = require('express');
const router = express.Router();
const multer = require('multer')
const path = require('path')
const adminController = require('../controllers/admin/adminController')
const { userAuth, adminAuth } = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const brandController = require('../controllers/admin/brandController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fs = require('fs');
        let uploadDir;
        if (req.originalUrl.includes('/addBrand')) {
            uploadDir = path.join(__dirname, '../public/uploads/brands');
        } else {
            uploadDir = path.join(__dirname, '../public/uploads/product-images');
        }
        
        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};


const uploadAny = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB file size limit
    }
}).any();



router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/dashboard-data', adminController.getDashboardDataAPI);
router.get('/logout', adminController.logout)
router.get('/customers', adminAuth, customerController.customerInfo)


router.post('/toggleBlock', adminAuth, customerController.toggleBlock);

router.get('/category', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.patch('/toggleCategory/:id', adminAuth, categoryController.toggleCategory)

router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory)

//product mgt

router.get("/addProducts", adminAuth, productController.getProductAddPage)
router.post("/addProducts", adminAuth, uploadAny, productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
router.patch('/toggle-list/:id', adminAuth, productController.toggleProductList)
router.patch('/toggleCategory/:id', adminAuth, categoryController.toggleCategory)
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post("/editProduct/:id", adminAuth, uploadAny, productController.editProduct)
router.post('/deleteImage', adminAuth, productController.deleteSingleImage)
router.post('/addProductOffer', adminAuth, productController.addProductOffer)
router.post('/deleteProductOffer', adminAuth, productController.deleteProductOffer)


//brand mgt

router.get('/brands', adminAuth, brandController.getBrandPage)  
router.post('/addBrand', adminAuth, uploadAny, brandController.addBrand)
router.get('/blockBrand', adminAuth, brandController.blockBrand)
router.get('/unblockBrand', adminAuth, brandController.unblockBrand)
router.get('/deleteBrand', adminAuth, brandController.deleteBrand)

//order mgt

router.get('/orders', adminAuth, orderController.getOrdersPage)
router.post('/updateOrder', adminAuth, orderController.updateOrder)
router.post('/cancelOrder', adminAuth, orderController.cancelOrder)
router.post('/approveReturn', adminAuth, orderController.approveReturn)
router.post('/rejectReturn/:orderId', adminAuth, orderController.rejectReturn)


//coupon management

router.get('/coupons', adminAuth, couponController.getCouponPage)
router.post('/addCoupon', adminAuth, couponController.addCoupon)
router.patch('/toggle-coupon/:id', adminAuth, couponController.toggleCoupon)

//sales report

router.get('/salesReport', adminAuth, orderController.getSalesReport)
router.get('/salesReportPDF/pdf', adminAuth, orderController.getSalesReportPDF)
router.get('/salesReportExcel/excel', adminAuth, orderController.getSalesReportExcel);


module.exports = router