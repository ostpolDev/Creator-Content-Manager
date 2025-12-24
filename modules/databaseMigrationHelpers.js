const { Knex } = require("knex");
const logger = require("./logger.js");
const { YTDurationToSeconds } = require("./youtubeHelpers.js");

/**
 * 
 * @param {Knex} knex 
 */
async function CalculateVideoDurations(knex) {
    const start = Date.now();
    logger.info("Calculating video duration");

    try {

        const durations = await knex("video_infos").whereRaw("properties->>'contentDetails' IS NOT NULL").select(["id", "properties"]);
        if (!durations || durations.length <= 0) {
            logger.info("No videos found that need updating");
            return;
        }

        logger.info(`Updating ${durations.length} video duration counts`);

        for (let i = 0; i < durations.length; i++) {
            await knex("video_infos").update({duration: YTDurationToSeconds(durations[i].properties.contentDetails.duration)}).where({id: durations[i].id}).limit(1);
        }        

    } catch (e) {
        logger.error(e);
    } finally {
        logger.info(`Finished calculating video duration in ${Date.now() - start}ms`);
    }
}


module.exports = { CalculateVideoDurations }
