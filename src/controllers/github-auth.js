const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const express = require("express");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET_KEY,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log("=== PROFIL GITHUB REÇU ===");
        console.log("Username:", profile.username);
        
        // Récupération de l'email
        let email = null;
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
          console.log("Email trouvé dans le profil:", email);
        } else {
          try {
            console.log("Récupération email via API GitHub...");
            const emailResponse = await axios.get('https://api.github.com/user/emails', {
              headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'VoxNotes-App',
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            
            console.log("Emails reçus:", emailResponse.data);
            const primaryEmail = emailResponse.data.find(email => email.primary);
            if (primaryEmail) {
              email = primaryEmail.email;
              console.log("Email primaire trouvé:", email);
            } else if (emailResponse.data.length > 0) {
              email = emailResponse.data[0].email;
              console.log("Premier email trouvé:", email);
            }
          } catch (emailError) {
            console.log("Erreur récupération email API GitHub:", emailError.message);
          }
        }

        if (!email) {
          email = `${profile.username}@users.noreply.github.com`;
          console.log("Utilisation du fallback email:", email);
        }

        console.log("Email final utilisé:", email);

        // Vérifier si l'email existe déjà (tous providers)
        try {
          const checkResponse = await axios.post('http://localhost:9090/api/users/check', {
            email: email,
          });
          
          if (checkResponse.data.exists) {
            const existingUser = checkResponse.data.user;
            
            if (existingUser.provider === 'github') {
              // Même provider, connexion
              console.log("Utilisateur GitHub existant trouvé, connexion...");
              return cb(null, {
                ...profile,
                realEmail: email
              });
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
              console.log("Création nouvel utilisateur GitHub...");
              await axios.post('http://localhost:9090/api/users/register', {
                username: profile.username,
                email: email,
                provider: profile.provider,
                password: "$2a$10$edanz0LM3iu3GqzqYhrdvOg7.byqfMGdf/RvC11eO9f/3xterEstm",
              });
              
              console.log("Utilisateur GitHub créé avec succès");
              return cb(null, {
                ...profile,
                realEmail: email
              });
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
        console.error('Error during GitHub OAuth:', error.message);
        return cb(error);
      }
    }
  )
);

router.get("/", passport.authenticate("github", { scope: ["user:email"] }));

router.get(
  "/callback",
  (req, res, next) => {
    passport.authenticate("github", (err, user, info) => {
      if (err) {
        console.error("Erreur Passport GitHub:", err);
        
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
          const username = req.user.username || req.user.displayName;
          
          // Utiliser l'email réel stocké lors de l'authentification
          let email = req.user.realEmail;
          
          if (!email) {
            if (req.user.emails && req.user.emails.length > 0) {
              email = req.user.emails[0].value;
            } else {
              email = `${username}@users.noreply.github.com`;
            }
          }
          
          const provider = req.user.provider;
          
          const checkUserResponse = await axios.post('http://localhost:9090/api/users/check', {
            email: email,
            provider: "github",
          });
          
          const user = checkUserResponse.data.user;
          
          if (!user || !user._id) {
            return res.redirect("http://localhost:9010/connexion?error=user_not_found");
          }
          
          const redirectUrl = `http://localhost:9010/profile?provider=${encodeURIComponent(provider)}&username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&_id=${encodeURIComponent(user._id)}`;
          
          console.log("Redirection vers:", redirectUrl);
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
    email: req.session.passport.user.realEmail || req.session.passport.user.emails?.[0]?.value || `${req.session.passport.user.username}@users.noreply.github.com`,
    provider: req.session.passport.user.provider,
  };
  res.render("success", { user: userInfo });
});

router.get("/error", (req, res) => res.send("Error logging in via GitHub.."));

router.get("/signout", (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log("session destroyed.");
    });
    res.status(200).json({ message: "Signed out successfully" });
  } catch (err) {
    res.status(400).send({ message: "Failed to sign out github user" });
  }
});

module.exports = router;