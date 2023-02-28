module.exports = {
    database: 'mongodb://127.0.0.1:27017/'+process.env.MONGO_PATH,
    secret: process.env.MONGO_SECRET
}