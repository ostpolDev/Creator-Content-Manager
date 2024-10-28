const path = require('path')

const winston = require('winston');
const { combine, timestamp, label, printf, json } = winston.format;
require('winston-daily-rotate-file');

const logPath = path.join(__dirname, "../logs");

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
})

var transport = new winston.transports.DailyRotateFile({
    filename: path.join(logPath, 'CCM-%DATE%.log'),
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '4d'
});


winston.loggers.add('default', {
    level: "info",
    format: combine(
        label({ label: "Default" }),
        timestamp(),
        logFormat
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        transport
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(logPath, "exceptions.log") })
    ]
})

let logger = winston.loggers.get('default');

if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = logger