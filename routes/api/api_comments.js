const router = require('express').Router();
const { knex } = require('../../modules/database');
const { HasAccess, Exists, GetOptionsFromIdentifier } = require('../../modules/dataHelpers');
const { sanitizeFull } = require('../../modules/marked');
const textHelpers = require('../../modules/textHelpers');

router.post("/add", async (req, res, next) => {
    let identifier = req.body.identifier;
    let content = req.body.content;
    let parent = req.body.parent;

    if (!identifier) {
        return res.status(400).json({success: false, msg: "Identifier required"});
    }

    if (!content) {
        return res.status(400).json({success: false, msg: "Content required"});
    }

    try {

        if (req.user.level != -1) {
            let hasAccess = await HasAccess(GetOptionsFromIdentifier(identifier), req.user.id);
            if (!hasAccess) {
                return res.status(401).json({success: false, msg: "Access denied"});
            }
        } else {
            let exists = await Exists(identifier);
            if (!exists) {
                return res.status(404).json({success: false, msg: "Target not found"});
            }
        }

        content = textHelpers.CompressString(sanitizeFull(content), true).text;
        

        if (parent) {
            let parentCheck = await knex("comments").where({id: parent}).limit(1).select(["id"]);
            if (!parentCheck[0]) {
                return res.status(404).json({success: false, msg: "Parent comment not found"});
            }
            await knex("comments").where({id: parent}).increment("replies", 1);
        }

        let newComment = await knex("comments").insert({
            target: identifier,
            parent: parent || null,
            added_by: req.user.id,
            content
        }, "id");

        return res.status(200).json({success: true, comment: newComment[0].id});

    } catch (e) {
        return next(e);
    }
})

router.get("/list", async (req, res, next) => {
    let identifier = req.query.identifier;
    let parent = req.query.parent;
    let limit = req.query.limit;
    let skip = req.query.skip;

    if (!limit || isNaN(limit) || limit < 0) {
        limit = 50;
    }

    if (!skip || isNaN(skip) || skip < 0) {
        skip = 0;
    }

    if (!identifier) {
        return res.status(400).json({success: false, msg: "Identifier required"});
    }

    try {

        if (req.user.level != -1) {
            let hasAccess = await HasAccess(GetOptionsFromIdentifier(identifier), req.user.id);
            if (!hasAccess) {
                return res.status(401).json({success: false, msg: "Access denied"});
            }
        }

        let commentsQuery = knex("comments").where({"comments.target": identifier})
            .innerJoin("users", "users.id", "=", "comments.added_by").limit(limit).offset(skip)
            .leftOuterJoin("comment_likes", (f) => {
                f.on("comment_likes.comment", "=", "comments.id")
                .andOn("comment_likes.user", "=", req.user.id)
            }).orderBy("created_at", "desc")
            .select([
                "comments.id", "comments.likes", "comments.replies", "comments.content",
                "users.username as author_username", "users.display_name as author_display_name",
                "users.profile_image_url as author_image_url", "comments.created_at",
                "comment_likes.comment as like_id"
            ])

        if (parent) {
            commentsQuery.where({"comments.parent": parent});
        } else {
            commentsQuery.whereNull("comments.parent");
        }

        commentsQuery.then(comments => {
            return res.status(200).json({success: true, reachedEnd: comments.length < limit, items: comments.map(x => ({
                ...x,
                content: textHelpers.UnzipString(x.content, "gzip"),
                isAuthor: req.user.username == x.author_username,
                isLiked: x.like_id != null
            }))})
        }).catch(e => {
            return next(e);
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
