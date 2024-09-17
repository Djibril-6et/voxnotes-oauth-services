const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const express = require("express");
const router = express.Router();
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // Call db-api to check if user exists
        const checkUserResponse = await axios.post('http://localhost:9090/users/check', {
          email: profile.emails[0].value,
          provider: "google",
        });

        let user = checkUserResponse.data.user;

        if (!user) {
          console.log("Adding new google user to DB..");
          
          // Call db-api to create a new user
          const createUserResponse = await axios.post('http://localhost:9090/users/register', {
            username: profile.username,
            email: profile.emails[0].value,
            provider: profile.provider,
            password: "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm", // use a dummy hash for OAuth users
          });

          user = createUserResponse.data.user;
        } else {
          console.log("Google user already exists in DB..");
        }

        return cb(null, profile);
      } catch (error) {
        console.error('Error during Google OAuth:', error);
        return cb(error);
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
