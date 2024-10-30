const { knex } = require("./database");
const logger = require("./logger");
const { escapeRegExp } = require("./textHelpers");

const commonToReplace = ["y2matecom", "redditsavecom", "y2mate.com", "redditsave.com", "[Mpgun.com]", "[mpgun.com]", "Mpgun.com", "mpgun.com"];

const fileTypes = [".jpg", ".png", ".mp3", ".mp4", ".wmv", ".webp", ".ogg", ".jpeg", ".pdn", ".wav", ".txt", ".md"];
const assetTypes = ["music", "soundEffect", "video", "image", "text", "user", "fav"];
const licenseTypes = {
    "None": {},
    "Attribution": { url: "https://creativecommons.org/licenses/by/4.0", icon: "/img/cc/att-88x31.png", msg: "You are free to use and share commercially, but you must provide credit." },
    "Attribution-ShareAlike": { url: "https://creativecommons.org/licenses/by-sa/4.0", icon: "/img/cc/attr-shal88x31.png", msg: "You are free to use and share commercially, but you must provide credit. If you modify this asset in any way, it must be published under the same license." },
    "Attribution-NoDerivs": { url: "https://creativecommons.org/licenses/by-nd/4.0", icon: "/img/cc/attr-noder88x31.png", msg: "You are free to use and share commercially, but you must provide credit. Modifications made to this asset may not be published or shared." },
    "Attribution-NonCommercial": { url: "https://creativecommons.org/licenses/by-nc/4.0", icon: "/img/cc/attr-nocom88x31.png", msg: "You are free to use and share but NOT commercially (i.e. YouTube), and you must provide credit." },
    "Attribution-NonCommercial-ShareAlike": { url: "https://creativecommons.org/licenses/by-nc-sa/4.0", icon: "/img/cc/attr-nocomshal88x31.png", msg: "You are free to use and share but NOT commercially (i.e. YouTube), and you must provide credit. If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original."},
    "Attribution-NonCommercial-NoDerivs": { url: "https://creativecommons.org/licenses/by-nc-nd/4.0", icon: "/img/cc/attr-nocomnoder88x31.png", msg: "You are free to use and share but NOT commercially (i.e. YouTube), and you must provide credit. Modifications made to this asset may not be published or shared." },
    "CC0": { url: "https://creativecommons.org/publicdomain/zero/1.0/", icon: "/img/cc/public-88x31.png", msg: "The person who associated a work with this deed has dedicated the work to the public domain by waiving all of their rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law." }
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

let test = "[NAME] is great [NAME]"

function ParseLegalText(legal, asset) {
    if (!legal || !asset) {
        return undefined;
    }

    const map = {
        "NAME": asset.name
    }

    Object.keys(map).forEach(m => {
        let r = new RegExp(`\\[${escapeRegExp(m)}\\]`, "g");
        legal = legal.replace(r, map[m]);
    })

    return legal;
}

console.log(ParseLegalText(test, {
    name: "Cool asset name"
}));


module.exports = { fileTypes, assetTypes, licenseTypes, TriggerDownload, TriggerMassDownload, ParseLegalText }
