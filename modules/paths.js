const path = require('path');

const root = path.join(__dirname, "..");
const views = path.join(root, "views");
const routes = path.join(root, "routes");
const public = path.join(root, "public");
const tmp = path.join(root, "tmp");
const upload = path.join(root, "uploads");

module.exports = {
    root, views, routes, public, tmp, upload
}