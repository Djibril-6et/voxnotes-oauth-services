const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const express = require("express");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_SECRET_KEY,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log("=== PROFIL DISCORD REÇU ===");
        console.log("Username:", profile.username);
        console.log("Email:", profile.email);
        
        const email = profile.email;

        // Vérifier si l'email existe déjà (tous providers)
        try {
          const checkResponse = await axios.post('http://localhost:9090/api/users/check', {
            email: email,
          });
          
          if (checkResponse.data.exists) {
            const existingUser = checkResponse.data.user;
            
            if (existingUser.provider === 'discord') {
              // Même provider, connexion
              console.log("Utilisateur Discord existant trouvé, connexion...");
              return cb(null, profile);
            } else {
              // Autre provider, erreur
              console.log(`Email déjà utilisé avec le provider: ${existingUser.provider}`);
              const error = new Error("Cet email est déjà utilisé par un autre compte.");
              error.code = 'EMAIL_ALREADY_EXISTS';
              error.email = email;
              return cb(error);
            }
          } else {
            // L'utilisateur n'existe pas, créer
            try {
              console.log("Création nouvel utilisateur Discord...");
              await axios.post('http://localhost:9090/api/users/register', {
                username: profile.username,
                email: email,
                provider: profile.provider,
                password: "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm",
              });
              
              console.log("Utilisateur Discord créé avec succès");
              return cb(null, profile);
            } catch (createError) {
              console.error("Erreur création:", createError.response?.data);
              // Si erreur de création (ex: username déjà pris), propager l'erreur
              if (createError.response?.data?.error?.includes('username')) {
                const error = new Error(`Le nom d'utilisateur ${profile.username} est déjà pris.`);
                error.code = 'USERNAME_ALREADY_EXISTS';
                return cb(error);
              }
              return cb(createError);
            }
          }
        } catch (checkError) {
          console.error("Erreur lors de la vérification:", checkError);
          return cb(checkError);
        }

      } catch (error) {
        console.error('Error during Discord OAuth:', error.message);
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
  (req, res, next) => {
    passport.authenticate("discord", (err, user, info) => {
      if (err) {
        console.error("Erreur Passport Discord:", err);
        
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          return res.redirect(`http://localhost:9010/connexion?error=email_exists&email=${encodeURIComponent(err.email)}`);
        } else if (err.code === 'USERNAME_ALREADY_EXISTS') {
          return res.redirect(`http://localhost:9010/connexion?error=username_exists`);
        } else {
          return res.redirect("http://localhost:9010/connexion?error=auth_error");
        }
      }
      
      if (!user) {
        return res.redirect("http://localhost:9010/connexion?error=auth_failed");
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("http://localhost:9010/connexion?error=login_error");
        }
        
        try {
          const username = req.user.username;
          const email = req.user.email;
          const provider = req.user.provider;
          
          const checkUserResponse = await axios.post('http://localhost:9090/api/users/check', {
            email: email,
            provider: "discord",
          });
          
          const user = checkUserResponse.data.user;
          
          if (!user || !user._id) {
            return res.redirect("http://localhost:9010/connexion?error=user_not_found");
          }
          
          const redirectUrl = `http://localhost:9010/profile?provider=${encodeURIComponent(provider)}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&_id=${encodeURIComponent(user._id)}`;
          
          res.redirect(redirectUrl);
          
        } catch (error) {
          console.error("Erreur dans le callback:", error);
          res.redirect("http://localhost:9010/connexion?error=callback_error");
        }
      });
    })(req, res, next);
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
    res.status(200).json({ message: "Signed out successfully" });
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out discord user" });
  }
});

module.exports = router;