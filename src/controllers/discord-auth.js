const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const express = require("express");
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
      try {
        // Call db-api to check if user exists
        const checkUserResponse = await axios.post('http://localhost:9090/users/check', {
          email: profile.email,
          provider: 'discord',
        });

        let user = checkUserResponse.data.user;

        if (!user) {
          console.log("Adding new discord user to DB..");
          
          // Call db-api to create a new user
          const createUserResponse = await axios.post('http://localhost:9090/users/register', {
            username: profile.username,
            email: profile.emails[0].value,
            provider: 'github',
            password: "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm", // use a dummy hash for OAuth users
          });

          user = createUserResponse.data.user;
        } else {
          console.log("Discord user already exists in DB..");
        }

        return cb(null, profile);
      } catch (error) {
        console.error('Error during GitHub OAuth:', error);
        return cb(error);
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
    const username = req.session.passport.user.username;
    const email = req.session.passport.user.email;
    const provider = req.session.passport.user.provider;
    res.redirect(`http://localhost:3000/profile?provider=${provider}&username=${username}&email=${email}`);
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
    res.status(200);
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out discord user" });
  }
});

module.exports = router;
