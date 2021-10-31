const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const PDFDocument = require('pdfkit'); //creating pdf on the fly

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  // // Product.fetchAll() //used while working with mongoDb alone
  // Product.find()  //this gives list and not cursor like in mongoDb alone
  //   //"find" is a method give by mongoose to query data from collection
  //   .then(products => {
  //     res.render('shop/product-list', {
  //       prods: products,
  //       pageTitle: 'All Products',
  //       path: '/products',
  //       isAuthenticated: req.session.isLoggedIn
  //     });
  //   })

  //above code is commented as we have implemented paginationin below code

  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(productCount =>{
      totalItems = productCount;
      return Product.find()  //this gives list and not cursor like in mongoDb alone
        //"find" is a method given by mongoose to query data from collection
        //but like mongodb we can use "skip" and "limit" method on it to control
        //amount of data we retrieve.
        .skip((page -1) * ITEMS_PER_PAGE) //skip data from queried response
        .limit(ITEMS_PER_PAGE) //limit data from queried response

         // Product.fetchAll() //used while working with mongoDb alone
    })  
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page -1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        // isAuthenticated: req.session.isLoggedIn, //already coming from common middleware
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId) //"findById" is a method given by mongoose
  //also we can pass "id" as a string and don't have to convort in to "ObjectId('...')"
  //like we did while querying mongoDb. Mongoose handles it for us.
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(productCount =>{
      totalItems = productCount;
      return Product.find()  //this gives list and not cursor like in mongoDb alone
        //"find" is a method given by mongoose to query data from collection
        //but like mongodb we can use "skip" and "limit" method on it to control
        //amount of data we retrieve.
        .skip((page -1) * ITEMS_PER_PAGE) //skip data from queried response
        .limit(ITEMS_PER_PAGE) //limit data from queried response

         // Product.fetchAll() //used while working with mongoDb alone
    })  
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page -1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        // isAuthenticated: req.session.isLoggedIn, //already coming from common middleware
        // csrfToken: req.csrfToken() //passing "CSRF" token to our view
        //will validate same when any POST request comes
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    //.execPopulate()   //earlier "populate" wasn't returning promise, so to return promise to 
    //".then" by chaining "execPopulate" in-between
    //but now "populate" returns promise.
    .then(user => {
      const products = user.cart.items;

      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)//"findById" is a method given by mongoose to filter based on _id.
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      // console.log(result);
      res.redirect('/cart');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  // let fetchedCart;
  // let newQuantity = 1;
  // req.user
  //   .getCart()
  //   .then(cart => {
  //     fetchedCart = cart;
  //     return cart.getProducts({ where: { id: prodId } });
  //   })
  //   .then(products => {
  //     let product;
  //     if (products.length > 0) {
  //       product = products[0];
  //     }

  //     if (product) {
  //       const oldQuantity = product.cartItem.quantity;
  //       newQuantity = oldQuantity + 1;
  //       return product;
  //     }
  //     return Product.findById(prodId);
  //   })
  //   .then(product => {
  //     return fetchedCart.addProduct(product, {
  //       through: { quantity: newQuantity }
  //     });
  //   })
  //   .then(() => {
  //     res.redirect('/cart');
  //   })
  //   .catch(err => console.log(err));
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.deleteCartItem(prodId)
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  // req.user
  //   .getCart()
  //   .then(cart => {
  //     return cart.getProducts({ where: { id: prodId } });
  //   })
  //   .then(products => {
  //     const product = products[0];
  //     return product.cartItem.destroy();
  //   })
  //   .then(result => {
  //     res.redirect('/cart');
  //   })
  //   .catch(err => console.log(err));
};

exports.getCheckout = (req, res, next) => {
  let products;

  req.user
    .populate('cart.items.productId')
    //.execPopulate()   //earlier "populate" wasn't returning promise, so to return promise to 
    //".then" by chaining "execPopulate" in-between
    //but now "populate" returns promise.
    .then(user => {
      products = user.cart.items;

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: 'usd',
            quantity: p.quantity
          };
        }),
        success_url: req.protocol + "://" + req.get('host') + '/checkout/success', //http://localhost:3000
        cancel_url: req.protocol + "://" + req.get('host') + '/checkout/cancel'
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout here',
        products: products,
        totalSum: products.reduce((accumulator, currentProduct) => {
          return accumulator + (currentProduct.quantity * currentProduct.productId.price);
        }, 0),
        sessionId: session.id
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    //.execPopulate()   //earlier "populate" wasn't returning promise, so to return promise to 
    //".then" by chaining "execPopulate" in-between
    //but now "populate" returns promise.
    .then(user => {
      const products = user.cart.items.map(item => {
        return {
          product: {...item.productId._doc},
          quantity: item.quantity
        };
        //"...item.productId._doc" is a special property which represent data related to
        //product on "item.productId", but it will be having many properties which we can't see
        //on console, so we are just retrieving "_doc"

        //we are facing this issue as we are storing above details back to mongoDb otherwise in
        //"getCart" method it worked fine as we were using it as a javascript object
      });

      const order = new Order({
        user:{
          userId: req.user, //mongoose will take care of fetching _id
          email: req.user.email
        },
        products: products
      });

      return order.save();
      //here we are storing "products" details back to mongodb in "order" model
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  // req.user
  //   .addOrder()
  //   .then(result => {
  //     res.redirect('/orders');
  //   })
  //   .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({'user.userId': req.user})
  .then(orders => {
    res.render('shop/orders', {
      path: '/orders',
      pageTitle: 'Your Orders',
      orders: orders,
      isAuthenticated: req.session.isLoggedIn
    });
  })
  .catch(err => {
    // console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
  
  // req.user
  //   .getOrders()
  //   .then(orders => {
  //     res.render('shop/orders', {
  //       path: '/orders',
  //       pageTitle: 'Your Orders',
  //       orders: orders
  //     });
  //   })
  //   .catch(err => console.log(err));
};

exports.getInvoice = (req,res,next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then(order => {
      if(!order){
        return next(new Error('No such order exist!'));
      }
      if(order.user.userId.toString() !== req.user._id.toString()){
        return next(new Error('Unauthorised access!'));
      }

      //if code has passed both the above conditions
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data','invoices', invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');

      pdfDoc.pipe(fs.createWriteStream(invoicePath)); //write to file on the fly
      pdfDoc.pipe(res); //send response in stream chunks to browser

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true
      });

      let totalPrice = 0;
      pdfDoc.fontSize(14).text("-------------------");
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;

        pdfDoc
        .fontSize(14)
        .text(
          prod.product.title +
          ' - ' +
          prod.quantity +
          ' x ' +
          '$' +
          prod.product.price
        );
      })
      pdfDoc.text("-------------------");
      pdfDoc.fontSize(20).text("Total price: $" + totalPrice);

      pdfDoc.end(); //this will close writable streams, indicates you are done writing.

      //Here we are reading whole file, loading it's content in memory and sending to
      //client but memory is limited so this can create problem when file size is large
      //OR there are many requests in memory, So alternative to this is to use
      //streams of data and read it chunk by chunk and sending response to browser in
      //chunks instead of reading whole file at once and sending full response in one go
      // fs.readFile(invoicePath, (err, data) =>{
      //   if(err){
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
      //   //instead of "inline" we can try "attachment" as well
      //   res.send(data);
      // })

      //sends file data in streams to browser
      // const file = fs.createReadStream(invoicePath); //create readStream
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
      // file.pipe(res); //"res" here is write stream to which "file" will write in streams
      //through "pipe"
    })
}