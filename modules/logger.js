const path = require('path')

const {createLogger, format, transports, loggers} = require('winston');
const {combine, timestamp, label, printf, json} = format;

const logPath = path.join(__dirname, "../logs");

const logFormat = printf(({level, message, label, timestamp}) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

loggers.add('default', {
    level: "info",
    format: combine(
        label({label: "Default"}),
        timestamp(),
        logFormat
    ),
    defaultMeta: {service: 'user-service'},
    transports: [
        new transports.File({filename: path.join(logPath, "error.log"), level: "error"}),
        new transports.File({filename: path.join(logPath, "combined.log")})
    ],
    exceptionHandlers: [
        new transports.File({filename: path.join(logPath, "exceptions.log")})
    ]
})

let logger = loggers.get('default');

if (process.env.NODE_ENV !== "production") {
    logger.add(new transports.Console({
        format: format.simple()
    }));
}

module.exports = logger