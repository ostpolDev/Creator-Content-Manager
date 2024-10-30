require('dotenv').config();

//#region Imports

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookie_parser = require('cookie-parser');
const passport = require('passport');
const upload = require('express-fileupload');
const { randomUUID } = require('crypto');
const compression = require('compression');
const logger = require('./modules/logger');
const pgSession = require('connect-pg-simple')(session);
const database = require('./modules/database');
const { VERSION } = require('./modules/data');

//#endregion

const PORT = process.env.CREATOR_PORT || 3000;
const HOSTNAME = process.env.CREATOR_HOSTNAME || "localhost";

const ENVIRONMENT = process.env.NODE_ENV || "development";

//#region Module Setup

async function Init() {
    try {
        await database.Create();
    } catch (e) {
        logger.error(e);
        logger.error(e.stack)
        process.exit();
    }
}
Init();

const app = express();

app.use(compression({filter: shouldCompress}));

function shouldCompress(req, res) {
    if (req.headers["x-no-compression"]) {
        return false;
    }
    return compression.filter(req, res);
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const MAX_AGE = 86400000;

app.use(session({
    secret: process.env.CREATOR_SESSION,
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: MAX_AGE,
        secure: false,
        httpOnly: true,
        sameSite: "lax"
    },
    store: new pgSession({
        pool: database.sessionDBAccess,
        tableName: "sessions",
        createTableIfMissing: true
    })
}))

app.use(cookie_parser(process.env.OST_SESSION));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(upload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    safeFileNames: false,
    abortOnLimit: false,
    responseOnLimit: "File upload limit has been reached",
    preserveExtension: true
}))

//#endregion

//#region Default routes

app.get("*", (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.environment = ENVIRONMENT;
    res.locals.url = `https://${req.get("host")}${req.originalUrl}`;
    res.locals.baseURL = `https://${req.get("host")}`;
    res.locals.version = VERSION;

    if (req.session && req.session.messages) {
        res.locals.messages = req.session.messages;
        req.session.messages = null;
    }
    next();
})

app.use("/", require('./routes/main'));

app.use(express.static(path.join(__dirname, "public")));

app.use((/**@type {Error} */ error, req, res, next) => {
    if (error.status && error.status == 404) {
        return res.status(404).render("404", {url: req.url, title: "404 - Page not found"});
    }

    let errorID = randomUUID();
    logger.error(errorID);
    logger.error(error);
    logger.error(error.stack);

    if (req.session) {
        req.session.errorURL = req.url;
    }

    if (req.url.startsWith("/api")) {
        return res.status(500).json({success: false, status: 500, msg: "Something went wrong", id: errorID});
    }

    return res.redirect(`/error?i=${encodeURIComponent(errorID)}`);
})

app.get("/error", (req, res) => {
    let id = req.query.i;
    if (!id) {
        return res.redirect("/");
    }
    let url = req.session ? req.session.errorURL : null;
    if (req.session) {
        req.session.errorURL = null;
    }
    res.render("error", {
        id,
        message: req.query.msg,
        errorURL: url
    })
})

// 404
app.use((req, res) => {
    if (req.accepts("html")) {
        return res.status(404).render("404", {url: req.url});
    } else if (req.accepts("json")) {
        return res.status(404).json({success: false, msg: "Not Found", error: "Not Found"});
    } else if (req.accepts("txt")) {
        return res.type("txt").status(404).send("Not Found");
    } else {
        return res.status(404).send();
    }
})

//#endregion

//#region Host

app.listen(PORT, HOSTNAME, () => {
    logger.info(`[S] Server listening on ${HOSTNAME}:${PORT} in ${ENVIRONMENT} mode`);
})

const gracefulShutdown = () => {
    process.exit();
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown);

//#endregion
