const router = require('express').Router();
const { knex } = require('../modules/database');

router.get("/", async (req, res, next) => {
    try {

        let selected = req.query.channel;

        let channels = await knex("channel_members").where({user: req.user.id})
            .innerJoin("channels", "channels.id", "=", "channel_members.channel")
            .select(["channels.id", "channels.name"]);

        let channelIndex = channels.findIndex(x => x.id == selected); 
        if (channelIndex == -1) {
            selected = null;
        }

        res.render("resources/index", {
            title: "Resources",
            channels,
            selected,
            channel: channelIndex == -1 ? null : channels[channelIndex]
        })

    } catch (e) {
        return next(e);
    }
})

module.exports = router;
