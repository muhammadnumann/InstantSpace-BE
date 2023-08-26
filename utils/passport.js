const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const AppError = require('./appError');
const catchAsync = require('./catchAsync');

passport.use(
  new GoogleStrategy(
    {
      clientID: '548714888497-4uvfec28nt9qr4bjlllr9omughdjg1kc.apps.googleusercontent.com',
      clientSecret: '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',
      callbackURL: 'http://localhost:3000/api/v1/users/signup/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          return done(new AppError('Email Already Exist' ,400))
        }
        return done(null, user);
      } catch (error) {
        console.error(error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;