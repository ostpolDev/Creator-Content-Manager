require('dotenv').config();

const config = require('./config/database');
const cookie_parser = require('cookie-parser');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const passport = require('passport');
const paths = require('./modules/paths');
const session = require('express-session');
const upload = require('express-fileupload');
const cookieSession = require('cookie-session');
const MemoryStore = require('memorystore')(session);
const uuid = require('uuid').v4;

const Channel = require('./models/channel');

const {body, validationResult} = require('express-validator');

const app = express();
const logger = require('./modules/logger');
const rateLimiter = require('./modules/rateLimiter');

const PORT = process.env.PORT || 3000;

var environment = process.env.NODE_ENV || 'development';

mongoose.connect(config.database, {useNewUrlParser: true, useUnifiedTopology: true});
let db = mongoose.connection;

db.once("open", () => {
    logger.info("Connected to MongoDB");
})

db.on("error", (err) => {
    logger.error(err);
})

app.use(helmet({contentSecurityPolicy: false}));


app.set("views", paths.views);
app.set("view engine", "pug");

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static(paths.public));

app.use(cookieSession({
    maxAge: 30*24*60*60*1000,
    keys: [process.env.COOKIE_SECRET],
    // secure: process.env.NODE_ENV === "production",
    name: process.env.SESSION_NAME
}))

const maxAge = 86400000;

app.use(session({
    secret: process.env.SESSION,
    resave: true,
    saveUninitialized: true,
    name: process.env.SESSION_NAME,
    store: new MemoryStore({
        checkPeriod: maxAge
    })
}));

app.use(require('connect-flash')());
app.use((req, res, next) => {
    res.locals.messages = require('express-messages')(req, res);
    next();
})

require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(upload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    // limits: {fileSize: 5 * 1024 * 1024},
    safeFileNames: true,
    abortOnLimit: false,
    responseOnLimit: "File upload limit has been reached",
    preserveExtension: true
}));

app.use(cookie_parser());

let colorModes = ["Auto", "Dark", "Light"]

console.log(`Running in ${environment === "production" ? "Production" : "Development"}`)

app.get('*', (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.url = 'https://' + req.get('host') + req.originalUrl;
    res.locals.colorModes = colorModes;
    res.locals.colorMode = req.cookies.colorMode;

    let channelQuery;

    if (req.user) {
        channelQuery = {$or: [
            {createdBy: req.user.id},
            {access: req.user.id}
        ]}
    }
    
    if (req.cookies.channel && mongoose.isValidObjectId(req.cookies.channel) && req.user) {

        Channel.findById(req.cookies.channel).select("name id").exec((err, channel) => {
            if (channel) {
                res.locals.channel = channel;
                next();
            } else {
                res.clearCookie("channel");
                res.locals.channel = undefined;
                res.redirect('/');
            }
        })

    } else if (req.user && !req.cookies.channel || req.cookies.channel == "undefined") {
        Channel.find(channelQuery).select("name id").exec((err, channels) => {
            if (channels && channels.length > 0) {
                res.cookie("channel", channels[0].id, {maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true})
                res.locals.channel = channels[0];
                res.redirect('/');
            } else {
                next();
            }
        })
    } else {
        next();
    }
});

app.use("*", (req, res, next) => {
    res.locals.environment = environment;
    next();
})

app.post('/setTheme', [
    body("theme", "Invalid theme").notEmpty().isLength({min: 1, max: 15}).isAlphanumeric()
], rateLimiter.rateLimiterMiddleware, (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).send();
    } else {
        let theme = req.body.theme;
        if (colorModes.includes(theme)) {
            res.cookie('colorMode', theme, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true });
            res.status(200).send();
        } else {
            res.status(400).send();
        }
    }
})

app.use("/api", require('./routes/api/_index'));

app.use("/", require('./routes/main'));
app.use("/users", require('./routes/users'));
app.use("/channels", require('./routes/channels'));
app.use("/videos", require("./routes/videos"));
app.use("/assets", require('./routes/assets'));


app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
})

app.use((error, req, res, next) => {

    if (error.status && error.status === 404) {
        res.status(404).render('404', { url: req.url, title: "404 - Page not found" });
        return;
    }
    let errorID = uuid();
    logger.error(errorID);
    logger.error(error);

    let url = "/error?i="+encodeURIComponent(errorID);
    if (environment !== "production") {
        url += "&msg="+encodeURIComponent(error.msg || error.message);
    }

    res.redirect(url);

})

app.get("/error", (req, res) => {
    let id = req.query.i;
    if (!id) {
        res.redirect('/');
        return;
    }
    res.render("error", {
        id,
        message: req.query.msg
    })
})

app.use(function(req, res){

    // respond with html page
    if (req.accepts('html')) {

        res.status(404).render('404', { url: req.url, title: "404 - Page not found" });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.status(404).json({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').status(404).send('Not found');
});
