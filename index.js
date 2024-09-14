const express = require('express');
const app = express();
const cors = require('cors');
const session = require('express-session');
const googleRouter = require('./src/controllers/google-auth');
const githubRouter = require('./src/controllers/github-auth');
const discordRouter = require('./src/controllers/discord-auth');
const passport = require('passport');

require('dotenv').config();

app.use(cors());

app.set('view engine', 'ejs');

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
  cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

app.get('/', (req, res) => {
  res.render('auth');
});

app.use('/auth/google', googleRouter);
app.use('/auth/github', githubRouter);
app.use('/auth/discord', discordRouter);

const port = process.env.PORT || 3009;
app.listen(port, () => console.log('App listening on port ' + port));