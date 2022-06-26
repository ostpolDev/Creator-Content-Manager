const express = require('express');
const router = express.Router();

const validation = require('../modules/validation');

router.get("/", validation.ensureAuthenticated, (req, res) => {
    
})

module.exports = router;