const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const Meta = require('../models/meta'); 
const path = require('path');
const fs = require('fs');
const paths = require('../modules/paths');

const fromTypes = ["batches", "assets"];

router.get("/v/:id", (req, res, next) => {
    let id = req.params.id;
    if (!isValidObjectId(id)) {
        req.flash('danger', "Invalid ID");
        return res.redirect("/");
    }

    let from = req.query.from;
    if (!isValidObjectId(from)) {
        from = undefined;
    }

    let type = req.query.type;
    if (!fromTypes.includes(type)) {
        type = fromTypes[0];
    }
    
    Meta.findById(id).populate("batch").exec((err, meta) => {
        if (err) {
            return next(err);
        }
        if (!meta) {
            return next();
        }
        
        try {
            let metaPath = path.join(paths.meta, meta.uuid + ".json");
            if (!fs.existsSync(metaPath)) {
                return next();
            }
    
            let content = JSON.parse(fs.readFileSync(metaPath, {encoding: "utf-8"}));
    
            return res.render("meta/view", {
                meta,
                content,
                title: "Metadata for " + meta.batch.name,
                from,
                type
            })
        } catch (e) {
            return next(e);
        }

    })

})

module.exports = router;