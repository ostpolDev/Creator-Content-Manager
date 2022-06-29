const express = require('express');
const router = express.Router();

const userFunctions = require('../../modules/userFunctions');
const logger = require('../../modules/logger');
const { isValidObjectId } = require('mongoose');
const validation = require('../../modules/validation');

router.post("/modifyFavorite", validation.ensureAuthenticated, async (req, res) => {
    let id = req.body.asset;
    let type = req.body.type;
    if (!isValidObjectId(id) || !type) {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    if (type != "add" && type != "remove") {
        return res.status(400).json({success: false, msg: "Invalid parameters"});
    }

    let result = await userFunctions.modifyFavorite(req.user.id, id, type);
    if (result.success === false) {
        return res.status(500).json({success: false, msg: "Something went wrong"});
    }
    return res.status(200).json({success: true, isInFavorites: result.isInFav});
})

module.exports = router;