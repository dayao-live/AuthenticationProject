//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const mongoose = require('mongoose');
mongoose.set('useUnifiedTopology', true);
const session = require("express-session");
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
// const encrypt = require ('mongoose-encryption'); //encrypt with a key
// const md5 = require('md5');  //md5 hashing
// const bcrypt = require('bcrypt');  //multi-rounds salting and hashing
// const saltRounds = 10;


const app = express();

// console.log("weak password hash "+md5("12345"));
// console.log("strong password hash "+md5("sfdsfsagafew423423rafsdf"));
// console.log(process.env.SECRET);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://localhost:27017/todolistDB",{useNewUrlParser:true});  //local mongodb
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
}); //mongodb atlas
mongoose.set('useCreateIndex', true);

const userSchema= new mongoose.Schema({
  email:String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)
// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ['password']});

const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  //  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home")
});

app.get("/auth/google",
  passport.authenticate("google",{scope:['profile']})
);

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.get("/login",function(req,res){
  res.render("login")
});

app.get("/register",function(req,res){
  res.render("register")
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/")

})

app.post("/register",function(req,res){
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate('local')(req, res, function() {
      res.redirect("/secrets");
    });
  }
});
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //
  //   newUser.save(function(err){
  //     if(err) console.log(err);
  //     else res.render("secrets")
  //   })
  // });


})


app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user, function(err){
    if(err)  console.log(err);
    else {
      passport.authenticate('local')(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })
  // const username=req.body.username;
  // const password=req.body.password;
  //
  // User.findOne({email:username},function(err,founduser){
  //   if(err) console.log(err);
  //   else{
  //     if(founduser){
  //       bcrypt.compare(password, founduser.password, function(err, result) {
  //         if(result === true) res.render("secrets");
  //       });
  //     }
  //   }
  // })

});














app.listen(3000, function() {
  console.log("server started on port 3000");
});
