const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const express = require("express");
const User = require("../models/user.model");
const router = express.Router();
require("dotenv").config();

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_SECRET_KEY,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      const user = await User.findOne({
        email: profile.email,
        provider: "discord",
      });
      if (!user) {
        console.log("Adding new discord user to DB..");
        //call bdd-api create user
        const user = new User({
          username: profile.username,
          provider: profile.provider,
          email: profile.email,
          provider: profile.provider,
          passwordHash:
            "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm",
        });
        await user.save();
        return cb(null, profile);
      } else {
        console.log("Discord user already exist in DB..");
        return cb(null, profile);
      }
    }
  )
);

router.get(
  "/",
  passport.authenticate("discord", { scope: ["identify", "email"] })
);

router.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/auth/discord/error" }),
  function (req, res) {
    res.redirect("/auth/discord/success");
  }
);

router.get("/success", async (req, res) => {
  const userInfo = {
    displayName: req.session.passport.user.username,
    email: req.session.passport.user.email,
    provider: req.session.passport.user.provider,
  };
  res.render("success", { user: userInfo });
});

router.get("/error", (req, res) => res.send("Error logging in via Discord.."));

router.get("/signout", (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.render("auth");
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out discord user" });
  }
});

module.exports = router;
