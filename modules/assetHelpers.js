const { knex } = require("./database");
const logger = require("./logger");

const commonToReplace = ["y2matecom", "redditsavecom", "y2mate.com", "redditsave.com", "[Mpgun.com]", "[mpgun.com]", "Mpgun.com", "mpgun.com"];

const fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp", ".ogg", ".jpeg", ".pdn", ".wav", ".txt", ".md"];
const assetTypes = ["music", "soundEffect", "video", "image", "text", "user", "fav"];
const licenseTypes = {
    "None": {},
    "Attribution": {url: "https://creativecommons.org/licenses/by/4.0", icon: "https://licensebuttons.net/l/by/3.0/88x31.png"},
    "Attribution-ShareAlike": {url: "https://creativecommons.org/licenses/by-sa/4.0", icon: "https://licensebuttons.net/l/by-sa/3.0/88x31.png"},
    "Attribution-NoDerivs": {url: "https://creativecommons.org/licenses/by-nd/4.0", icon: "https://licensebuttons.net/l/by-nd/3.0/88x31.png"},
    "Attribution-NonCommercial": {url: "https://creativecommons.org/licenses/by-nc/4.0", icon: "https://licensebuttons.net/l/by-nc/3.0/88x31.png"},
    "Attribution-NonCommercial-ShareAlike": {url: "https://creativecommons.org/licenses/by-nc-sa/4.0", icon: "https://licensebuttons.net/l/by-nc-sa/3.0/88x31.png"},
    "Attribution-NonCommercial-NoDerivs": {url: "https://creativecommons.org/licenses/by-nc-nd/4.0", icon: "https://licensebuttons.net/l/by-nc-nd/3.0/88x31.png"},
    "CC0": {url: "https://creativecommons.org/publicdomain/zero/1.0/", icon: "https://i.creativecommons.org/p/zero/1.0/88x31.png"}
}

async function TriggerDownload(assetId, userId) {
    try {

        let existCheck = await knex("downloads").where({asset: assetId, user: userId}).select("asset").limit(1);
        if (!existCheck[0]) {
            await knex("downloads").insert({asset: assetId, user: userId, count: 1});
        } else {
            await knex("downloads").where({asset: assetId, user: userId}).increment("count", 1).update({updated_at: new Date()});
        }

    } catch (e) {
        logger.error(e);
    }
}

/**
 * 
 * @param {[string]} assetIds 
 * @param {string} userId 
 */
async function TriggerMassDownload(assetIds, userId) {
    try {

        let updateRes = await knex("downloads").whereIn("asset", assetIds).andWhere({user: userId}).increment("count", 1).update({updated_at: new Date()}).returning("asset");
        let updatedIds = updateRes.map(x => x.asset);
        let missing = assetIds.map(x => !updatedIds.includes(x)).map(x => ({
            asset: x,
            user: userId,
            count: 1
        }));

        await knex("downloads").insert(missing);

    } catch (e) {
        logger.error(e);
    }
}

module.exports = { fileTypes, assetTypes, licenseTypes, TriggerDownload, TriggerMassDownload }
