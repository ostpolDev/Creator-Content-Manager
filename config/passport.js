const LocalStrategy = require('passport-local').Strategy;
const logger = require('../modules/logger');
const { knex } = require('../modules/database');
const encryption = require('../modules/encryption');

module.exports = (passport) => {
    // Local Strategy
    passport.use(new LocalStrategy(async (username, password, done) => {

        try {

            let user = await knex("users").select(["password", "id", "username", "id", "display_name", "level", "profile_image_url"]).where({username: username.toLowerCase().trim()}).limit(1);
            if (!user[0]) {
                return done(null, false, {message: "Invalid username or password"});
            }

            let verification = await encryption.Verify(password, user[0].password);
            if (!verification) {
                return done(null, false, {message: "Invalid username or password"})
            }

            return done(null, user[0]);

        } catch (e) {
            logger.error(e);
            return done(e, false);
        }

    }));

    passport.serializeUser((user, done) => {
        return done(null, user.id);
    })

    passport.deserializeUser(async (id, done) => {
        try {
            let user = await knex("users").where({id}).limit(1).select(["id", "username", "display_name", "name", "level", "profile_image_url", "created_at"]);
            return done(null, user[0] || false);
        } catch (e) {
            logger.error(e);
            return done(e, false);
        }
    })
}
