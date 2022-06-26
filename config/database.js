module.exports = {
    database: 'mongodb://localhost:27017/'+process.env.MONGO_PATH,
    secret: process.env.MONGO_SECRET
}