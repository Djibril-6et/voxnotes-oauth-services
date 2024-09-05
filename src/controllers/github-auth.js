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
        username: profile.username
      });
      if (!user) {
        console.log("Adding new github user to DB..");
        const user = new User({
          username: profile.username,
          provider: profile.provider,
          email: profile.emails[0].value,
          passwordHash: "$2a$10$eOviLBxIgbYpeYsybn199eGdiyKpzXdCITd5GRixgVRMqi2BkyRiC",
        });
        await user.save();
        console.log("Saved user:",user);
        return cb(null, profile);
      } else {
        console.log("Github user already exist in DB..");
        console.log(profile);
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
    // Successful authentication, redirect to success screen.
    res.redirect("/auth/github/success");
  }
);

router.get("/success", async (req, res) => {
  const userInfo = {
    id: req.session.passport.user.id,
    displayName: req.session.passport.user.username,
    provider: req.session.passport.user.provider,
  };
  res.render("github-success", { user: userInfo });
});

router.get("/error", (req, res) => res.send("Error logging in via Github.."));

router.get("/signout", (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.render("auth");
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out fb user" });
  }
});

module.exports = router;
