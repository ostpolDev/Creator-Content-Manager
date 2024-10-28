const bcrypt = require('bcrypt');

async function HashPassword(password) {
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(password, salt);
    return hash;
}

async function Verify(password, hash) {
    return bcrypt.compare(password, hash);
}

module.exports = { HashPassword, Verify }
