const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      const user = await User.findOne({
        email: profile.emails[0].value,
        provider: "google",
      });
      if (!user) {
        console.log("Adding new google user to DB..");
        //call bdd-api create user
        const user = new User({
          username: profile.displayName,
          provider: profile.provider,
          email: profile.emails[0].value,
          provider: profile.provider,
          passwordHash:
            "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm",
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

router.get(
  "/",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/error" }),
  function (req, res) {
    const username = req.session.passport.user.displayName;
    const email = req.session.passport.user.emails[0].value;
    const provider = req.session.passport.user.provider;
    res.redirect(`http://localhost:3000/profile?provider=${provider}&username=${username}&email=${email}`);
  }
);

router.get("/success", async (req, res) => {
    console.log("req.session.passport.user:", req.session.passport.user);
  const userInfo = {
    displayName: req.session.passport.user.displayName,
    email: req.session.passport.user.emails[0].value,
    provider: req.session.passport.user.provider,
  };
  res.render("success", { user: userInfo });
});

router.get("/error", (req, res) => res.send("Error logging in via Google.."));

router.get("/signout", (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.status(200);
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out google user" });
  }
});

module.exports = router;
