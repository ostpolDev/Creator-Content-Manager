const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const bcrypt = require('bcryptjs');

module.exports = (passport) => {
    // Local Strategy
    passport.use(new LocalStrategy((username, password, done) => {
        let query = {$or: [
            {email: username.toLowerCase()},
            {username: username.toLowerCase()}
        ]}
        User.findOne(query, (err, user) => {
            if (err) {
                console.error(err)
                // throw err;
                return done(null, false, {message: "Something went wrong. Please try again later"})
            }
            if (!user) {
                return done(null, false, {message: 'Wrong Username / Password'});
            }

            if (user.meta.blocked) {
                return done(null, false, {message: 'Your Account has been Permanently Suspended by an Admin'});
            }

            // Match Password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error(err);
                }
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, {message: "Wrong Username / Password"});
                }
            });
        })
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });

}