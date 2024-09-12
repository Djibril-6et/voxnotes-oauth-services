const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const express = require("express");
const User = require("../models/user.model");
const router = express.Router();
require("dotenv").config();

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET_KEY,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      const user = await User.findOne({
        email: profile.emails[0].value,
        provider: 'github',
      });
      if (!user) {
        console.log("Adding new github user to DB..");
        //call bdd-api create user
        const user = new User({
          username: profile.username,
          provider: profile.provider,
          email: profile.emails[0].value,
          provider: profile.provider,
          passwordHash: "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm",
        });
        await user.save();
        return cb(null, profile);
      } else {
        console.log("Github user already exist in DB..");
        return cb(null, profile);
      }
    }
  )
);

router.get("/", passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/callback",
  passport.authenticate("github", { failureRedirect: "/auth/github/error" }),
  function (req, res) {
    const username = req.session.passport.user.username;
    const email = req.session.passport.user.emails[0].value;
    const provider = req.session.passport.user.provider;
    res.redirect(`http://localhost:3000/profile?provider=${provider}&username=${username}&email=${email}`);
  }
);

router.get("/success", async (req, res) => {
  const userInfo = {
    displayName: req.session.passport.user.username,
    email: req.session.passport.user.emails[0].value,
    provider: req.session.passport.user.provider,
  };
  res.render("success", { user: userInfo });
});

router.get("/error", (req, res) => res.send("Error logging in via Github.."));

router.get("/signout", (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.status(200);
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out github user" });
  }
});

module.exports = router;
