const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');

// middleware to check for authentication session
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.get('/checkout/success', isAuth, shopController.postOrder); //will create order after payment

router.get('/checkout/cancel', isAuth, shopController.getCheckout);

// router.post('/create-order', isAuth, shopController.postOrder); //not needed to do manually

router.get('/orders', isAuth, shopController.getOrders);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;
