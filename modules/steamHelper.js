const logger = require('./logger');
const { CompressString } = require("./textHelpers");

const API_PATH = "https://store.steampowered.com/api/appdetails?appids=";

const URL_ID_REGEX = /\/(\d{1,})\//i;

/**
 * 
 * @param {string} id 
 * @returns 
 */
async function GetSteamGameInfo(id) {
    if (!id) {
        return null;
    }

    try {

        const gameInfo = {
            game: {
                name: "",
                description: "",
                compression: "",
                image_url: "",
                steam_id: id,
                website: "",
                developer: "",
                publisher: ""
            },
            info: {
                published: new Date(),
                platforms: "",
                dlc: 0,
                tags: ""
            }
        }

        logger.info(`Fetching steam game info: ${id}`);

        const fullURL = `${API_PATH}${encodeURIComponent(id)}`;
        const result = await fetch(fullURL, {
            headers: {
                "Accept": "application/json"
            }
        });

        const json = await result.json();

        if (Object.keys(json).length <= 0) {
            return null;
        }

        const game = json[Object.keys(json)[0]];

        if (!game.success) {
            logger.error(`Failed to fetch game (Steam server)`);
            return null;
        }

        const data = game.data;
        gameInfo.game.name = data.name;

        const compressedDescription = CompressString(data.detailed_description || data.about_the_game || data.short_description)

        gameInfo.game.description = compressedDescription.text;
        gameInfo.game.compression = compressedDescription.compression;

        gameInfo.game.image_url = data.header_image;
        gameInfo.game.website = data.website;
        gameInfo.game.developer = data.developers ? data.developers.join(", ") : null;
        gameInfo.game.publisher = data.publishers ? data.publishers.join(", ") : null;

        gameInfo.info.published = data.release_date ? new Date(data.release_date.date) : null;
        
        let platforms = [];
        Object.keys(data.platforms).forEach(k => {
            if (data.platforms[k] == true)
                platforms.push(k);
        })
        
        gameInfo.info.platforms = platforms.join(", ");
        gameInfo.info.dlc = data.dlc ? data.dlc.length : 0;
        gameInfo.info.tags = [...data.categories.map(x => x.description), ...data.genres.map(x => x.description)].join(",");

        return gameInfo;

    } catch (e) {
        logger.error(e);
        return null;
    }
}

/**
 * 
 * @param {string} url 
 * @returns {number?}
 */
function GetSteamGameIDFromURL(url) {
    const res = url.match(URL_ID_REGEX);
    if (!res || !res[1])
        return null;
    return isNaN(res[1]) ? null : res[1];
}

module.exports = { GetSteamGameInfo, GetSteamGameIDFromURL }
