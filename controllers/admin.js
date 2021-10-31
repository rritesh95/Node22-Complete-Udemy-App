const { validationResult } = require('express-validator');

const Product = require('../models/product');

const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.imageUrl;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: "Attached file format is not permitted",
      validationErrors: []
    });
  }

  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  
  //const product = new Product(title,price,description,imageUrl,null, req.user._id);
  //above code was used when working with mongoDb alone
  //below code is used when working with mongoDb + mongoose
  const imageUrl = image.path; //in case no error, retrieve local path from image object

  const product = new Product({
    title: title,
    imageUrl: imageUrl,
    description: description,
    price: price,
    // userId: req.user._id //can also write "req.user", mongoose will take _id by itself
    userId: req.user
  });

  product.save() //it will save details to database and "save" is a method given by mongoose
    .then(result => {
      // console.log(result);
      res.redirect('/admin/products');
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId) //"findById" is a method given by mongoose
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  // const updatedImageUrl = req.body.imageUrl;
  const image = req.file; //image file from front-end
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  // const product = new Product(updatedTitle,updatedPrice,updatedDesc,updatedImageUrl,prodId);
  Product.findById(prodId)
    .then(product => { //product we get here is a mongoose object on which we can run it's functions
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/');
      }

      product.title = updatedTitle;
      // product.imageUrl = updatedImageUrl;
      if(image){ //update image path only if given in edit
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.description = updatedDesc;
      product.price = updatedPrice;

      return product.save() //"save" is method given by mongoose to run on models
      //and here "product" is model returned by mongoose in "Product.findById(prodId)"
        .then(result => {
          console.log('UPDATED PRODUCT!');
          res.redirect('/admin/products');
        })
    })
    .catch(err => {
      // console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  // Product.fetchAll() //used while working with mongoDb alone
  Product.find({ userId: req.user._id })  //this gives list and not cursor like in mongoDb alone
    //"find" is a method give by mongoose to query data from collection
    
    //.select("title price -_id") //only bring specified fields from db and "-" is to specifically 
    //remove particular field, we are removing "_id" as even if not mentioned in list it
    //will come from database
    
    //.populate('userId', "name") //it is used to retrieve reference collection data and also
    //filter them 'userId' is the key which defines relation here
    
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
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

// exports.postDeleteProduct = (req, res, next) => {
//   const prodId = req.body.productId;

//   Product.findById(prodId)
//     .then(product => {
//       if(!product){
//         return next(new Error("Product not found!"));
//       }
//       fileHelper.deleteFile(product.imageUrl); //deleting image while deleting product
//       return Product.deleteOne({_id: prodId, userId: req.user._id}) //deleting it from db
//     })
//     .then(result => {
//       console.log('DESTROYED PRODUCT');
//       res.redirect('/admin/products');
//     })
//     .catch(err => {
//       // console.log(err);
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
  
// // // Product.findByIdAndRemove(prodId) //not checking user here

// // Product.deleteOne({_id: prodId, userId: req.user._id})
// //   .then(result => {
// //     console.log('DESTROYED PRODUCT');
// //     res.redirect('/admin/products');
// //   })
// //   .catch(err => {
// //     // console.log(err);
// //     const error = new Error(err);
// //     error.httpStatusCode = 500;
// //     return next(error);
// //   });
// // // above code is for mongoDb + mongoose

// //below code is the case when we used mongoDb alone
// // Product.deleteById(prodId)
// //   .then(() => {
// //     console.log('DESTROYED PRODUCT');
// //     res.redirect('/admin/products');
// //   })
// //   .catch(err => console.log(err));
// };

//replaced above method while workinwith async requests
//DELETE type of method to delete product
exports.deleteProduct = (req, res, next) => {
  // const prodId = req.body.productId; //"body" will not be there in case of "DELETE" request
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if(!product){
        return next(new Error("Product not found!"));
      }
      fileHelper.deleteFile(product.imageUrl); //deleting image while deleting product
      return Product.deleteOne({_id: prodId, userId: req.user._id}) //deleting it from db
    })
    .then(result => {
      console.log('DESTROYED PRODUCT');
      // res.redirect('/admin/products');
      res.status(200).json({ message: "Success!" });
    })
    .catch(err => {
      // const error = new Error(err);
      // error.httpStatusCode = 500;
      // return next(error);
      res.status(500).json({ message: "Product deletion failed!" });
    });
};
