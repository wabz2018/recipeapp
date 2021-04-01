const express = require('express')
const  path=require('path')
const ejs=require('ejs')
const bodyParser=require('body-parser')
const multer=require('multer')
const connection=require('./config')
const mysql=require('mysql')
const fs =require('fs')
const cors =require('cors')
const session=require('express-session')
const { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } = require('constants')
const port=3500
//initialize for  image upload
const storage= multer.diskStorage({
  destination:'./uploads/',
  filename:function (req,file, cb) {
      cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});
const upload= multer({
   storage:storage,
   limits:{fileSize:1024*1024*5},
   fileFilter:function(rweq, file, cb){
       checkFileType(file, cb);
   }
}).single('myimage');
function checkFileType(file, cb) {
//allowed extensions
const filetypes=/jpeg|png|gif|jpg/;
const extname =filetypes.test(path.extname(file.originalname).toLowerCase());
const mimetype=filetypes.test(file.mimetype);
if(mimetype && extname){
   return cb(null,true);
}
else{
   cb('Error: images only');}
}
const app=express()
//set views
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
app.use(bodyParser.json({limit:"50mb"}
))
app.use(bodyParser.urlencoded({extended:true,
    limit: "50mb",
    parameterLimit: 50000}))
app.set('public',path.join(__dirname,'public'))
app.use('/uploads',express.static('uploads'))
app.use('/images',express.static('images'))
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  }));

//declare controllers for crud
let addsourceController=require('./controllers/addsource-controller')
let addrecipeController=require('./controllers/addrecipe-controller')
let addingredientController=require('./controllers/addingredient-controller')
let addcategoryController=require('./controllers/addcategory-controller')
let authenticateController= require('./controllers/authenticate-controller');
let registerController =require('./controllers/register-controller');
const { json } = require('body-parser');
const { RSA_NO_PADDING } = require('constants');

app.post('/api/addsource',addsourceController.addsource);
app.post('/controllers/addsource-controller', addsourceController.addsource);

app.post('/api/addcategory',addcategoryController.addcategory);
app.post('/controllers/addcategory-controller', addcategoryController.addcategory);

app.post('/api/addrecipe',addrecipeController.addrecipe);
app.post('/controllers/addrecipe-controller', addrecipeController.addrecipe);

app.post('/api/addingredient',addingredientController.addingredient);
app.post('/controllers/addingredient-controller', addingredientController.addingredient);

app.post('/api/register',registerController.register);
app.post('/api/authenticate', authenticateController.authenticate)

app.post('/controllers/authenticate-controller',authenticateController.authenticate);
app.post('/controllers/register-controller', registerController.register)

//declare url routes
//login
app.get('/',(req, res)=>{
res.sendFile(__dirname+'/'+"login.html")
})

app.get('/login',(req, res)=>{
    res.sendFile(__dirname+'/'+"login.html")
    })
//auth 
 //render auth
 app.post('/auth', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (username && password) {
    connection.query('SELECT * FROM users WHERE username = ?  AND password = ?', [username, password], (error, results, fields) => {
      if (results.length > 0) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/dashboard');
      } else {
        res.send('Incorrect Username and/or Password!');
      }
      res.end();
    });
  } else {
    res.send('Please enter Username and Password!');
    res.end();
  }
});
 app.get('/register', function(req, res) {
      res.render('register',{
         title:'Recipe |App',
          hd: 'Registration Panel '
      });
     }
 );
 app.post('/upload', (req,res)=>{
   if(req.session.loggedin){
     upload(req, res,(err)=> {
         if (err) {
             res.render('index', {
                 msg: err,
                 title:'Image  Upload',
                 hd:'Image Upload'
             });
         } else {
             if(req.file==undefined){
     res.render('index',{
         msg:'Error:No file selected of upload!',
         title:'Image  Upload',
         hd:'Image Upload'
     } );
             }
             else{
                 console.log(req.file);
                 res.render('index',{
                    msg:'File successfull uploaded',
                     title:'uploaded Image',
                     hd:'Image Details' ,
                     file: `uploads/${req.file.filename}`
 
                 });
             }
         }
     });
    }
    else{
      res.sendFile(__dirname + '/' + "login.html");
    }
 });

  app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
      res.render('dashboard', {
        title: 'Recipe  | DASHBOARD',
        hd: 'Main Panel',
        username: req.session.username
      });
    } else {
      res.sendFile(__dirname + '/' + "login.html");
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.sendFile(__dirname + '/' + "login.html");
  });
//maintain source recipe, category
app.get('/addsource', (req, res)=>{
  if(req.session.loggedin){
res.render('source', {
  title:'Recipe|App', 
  hd:'Add source '
})
  }
  else{
    res.sendFile(__dirname + '/' + "login.html");
  }

})

app.get('/addcategory', (req, res)=>{
  if(req.session.loggedin){
  let sql="SELECT id, sourcename, chefname from sources"
  connection.query(sql, (err, rows)=>{
 res.render('category', {
   title:'Recipe|App', 
   hd:'Add Recipe Category',
   sources:rows
 })
})
  }
  else{
    res.sendFile(__dirname + '/' + "login.html");
  }

})
app.get('/addrecipe', (req, res)=>{
  if(req.session.loggedin){
  let sql="SELECT id, name from category"
  connection.query(sql, (err, rows)=>{
    res.render('recipe',{
      title:'Recipe|App',
      hd:'Add Recipe', 
      categorys:rows
    })
  })
  }
  else{
    res.sendFile(__dirname + '/' + "login.html");
  }

})

//view source, recipes
app.get('/sources', (req, res) => {
  if (req.session.loggedin) {
    let sql = "SELECT * from sources";
    connection.query(sql, (err, rows) => {
      if (err) throw err;
      res.render('sources', {
        title: 'Recipe | App',
        hd: 'All Sources',
        sources: rows
      })
    });
  } else {
    res.sendFile(__dirname + '/' + "login.html");
  }
});

app.get('/categorys', (req, res) => {
  if (req.session.loggedin) {
    let sql = "SELECT * from category";
    connection.query(sql, (err, rows) => {
      if (err) throw err;
      res.render('categorys', {
        title: 'Recipe | App',
        hd: 'All Category',
        categorys: rows
      })
    });
  } else {
    res.sendFile(__dirname + '/' + "login.html");
  }
});

app.get('/recipes', (req, res) => {
  if (req.session.loggedin) {
    let sql = "SELECT * from recipe";
    connection.query(sql, (err, rows) => {
      if (err) throw err;
      res.render('recipes', {
        title: 'Recipe | App',
        hd: 'All Recipes',
        recipes: rows
      })
    });
  } else {
    res.sendFile(__dirname + '/' + "login.html");
  }
});
//error handling for pages 
app.use(function(err, req, res, next) {
    // Parse error
    // Ex. if error = 500, render 500.jade page
    // At the end
    next(err);
  });
  
  // This is called on any page not in router.
  app.use(function(req, res, next) {
    res.status(404);
  
    // respond with html page
    if (req.accepts('html')) {
      res.render('error', { title: '404 Error.' });
      return;
    } 
  
    // respond with json
    if (req.accepts('json')) {
      res.send({ error: 'Not found' });
      return;
    }
  
    // default to plain-text. send()
    res.type('txt').send('Not found');
  });


    //start of the application 

    app.listen(port,()=>{
        console.log('server running on port:'+port)
    })