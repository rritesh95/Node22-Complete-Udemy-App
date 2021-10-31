const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session'); //express session library to maintain sessions
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf'); //package to implement CSRF tokens
const flash = require('connect-flash'); //package to implement flash messages
const multer = require('multer'); //package to parse input requests with files
require('dotenv').config({ path: __dirname + '/.env' }); //To implement "environment variables"
const helmet = require('helmet'); //to set secure headers in response
const compression = require('compression'); //to add compression of static content
const morgan = require('morgan');

const errorController = require('./controllers/error');
// const mongoConnect = require('./util/database').mongoConnect;
const User = require('./models/user');


console.log(process.env.NODE_ENV); //also set by hosting provider

const MONGODB_URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@node-complete-shard-00-00.0vl9o.mongodb.net:27017,node-complete-shard-00-01.0vl9o.mongodb.net:27017,node-complete-shard-00-02.0vl9o.mongodb.net:27017/${process.env.MONGO_DEFAULT_DB}?ssl=true&replicaSet=atlas-13wbgl-shard-0&authSource=admin&retryWrites=true&w=majority`;
const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
})
const csrfProtection = csrf(); //initialize our "csurf" plugin
//in "csrf()" you can pass object which it use for configuration default is "session",
//it depends on what mechanisam we are using for sign in

///////////////////////////SSL certificate
// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({ //define how files will be stored in disk(multer)
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toDateString() + (Math.random()*1000).toFixed(0) + "-" + file.originalname);
    //instructor is using "toISOString()"" which is failing in my case so
    //replaced with "toDateString()"
  }
});

const fileFilter = (req, file, cb) => { //to filter specific "mimetypes"
  if(
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ){
    cb(null, true);
  }else{
    cb(null, false);
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream( //creating a write stream
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(helmet());  //to add secure headers in response
app.use(compression()); //to Add compression manually in server side app
app.use(morgan('combined', { stream : accessLogStream })); //'stream' will write to stream
//defined in 'accessLogStream', which is "access.log" in this case

app.use(bodyParser.urlencoded({ extended: false }));
//"urlencoded" will work when we use froms to send data to server but won't work
//with JSON input data

// app.use(multer({ dest: 'images'}).single('image')); //storing files in memory with default settings
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')); 
//works with "multipart(e.g.files) coming in input requests, storing files with customization

app.use(express.static(path.join(__dirname, 'public')));

app.use('/images', express.static(path.join(__dirname, 'images')));//retrieving file from server statically

app.use(session({
  secret: "my secret", //in real-world it should be a large string
  resave: false, //it specifies that don't save session on each request untill some information
  //we need to save in session is modified (helps in performance optimization)
  saveUninitialized: false, //ensure no session save happens for requests it is not intended to
  store: store //store to which session should be stored
  //must implement store for storing session instead of relying on memory which can create
  //performance problem if user requests increases also it's less secure
}));

app.use(csrfProtection); //have to do here, after user authentication mechanism is initialized
//here in our case it's session

app.use(flash()); //needs to initialize after session configuration is done.

app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})

app.use((req,res,next) => {
  if(!req.session.user){
    return next();
  }

  User.findById(req.session.user._id)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => {
      // throw new Error(err); //it will not reach middleware as it's an asynchronous code
      next(new Error(err)); //this will reach middleware while working with
      // asynchronous code
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500); //route to redirect in case of error as error-handling

app.use(errorController.get404);

//speacial error handling middleware
app.use((error, req, res, next) => {
  //res.redirect('/500'); //it will create infinite loop if in-between middlewares
  //are the reason for error throw, instead will render error page like shown below

  console.log("exception----", error);
  res.status(500).render('500', { //500 is a status code when something fail at server
    pageTitle: 'Page Not Found', 
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
})

// mongoConnect(() => { //while using mongodb alone without mongoose
//   app.listen(3000);
// });

mongoose.connect(
  MONGODB_URI
)
.then(() => {
  console.log('Connected!');
  //removed below code when implementing authentication
  // User.findOne() //it will send the first user it finds as no condition specified
  //   .then(user => {
  //     if(!user){
  //       const user = new User({
  //         name: "testUser",
  //         email: "testemail@test.com",
  //         cart: { items: [] }
  //       });

  //       user.save(); //it will create user in db
  //     }
  //   });
  
  
  app.listen(process.env.PORT || 3000); //"process.env.PORT" generally set by hosting provider

  ///////////////////////////SSL certificate
  // https.createServer({
  //   key: privateKey,
  //   cert: certificate
  // }, app).listen(process.env.PORT || 3000);
  //implementing "https" above to apply SSL certificate manually
  //hosting provider will implement SSL certificate
})
.catch(err => console.log(err));