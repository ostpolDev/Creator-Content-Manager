const { knex } = require('./database');
const logger = require('./logger');

/**
 * @typedef {Object} AccessCheckOptions
 * @property {"C"|"A"|"B"|"V"} type
 * @property {string} target
 * 
 * @param {AccessCheckOptions} result 
 * @param {*} user 
 * @returns {Promise<boolean>}
 */
async function HasAccess(result, user) {
    if (!result || !user) {
        return false;
    }

    let hasAccess = false;

    try {

        switch (result.type) {
            case "C":
                let channel = await knex("channel_members").where({ channel: result.target, user }).limit(1);
                hasAccess = channel && channel.length >= 0;
                break;
            case "A":
                let asset = await knex("assets").where({ id: result.target }).limit(1).select(["id", "resource_id"]);
                if (asset[0]) {
                    if (asset[0].resource_id && asset[0].resource_id != "GLOBAL") {
                        hasAccess = await HasAccess({ type: "C", target: asset[0].resource_id }, user);
                    } else {
                        hasAccess = true;
                    }
                }
                break;
            case "B":
                let batch = await knex("batches").where({ id: result.target }).limit(1).select(["id", "is_resource_batch"]);
                if (batch[0]) {
                    if (batch[0].is_resource_batch) {
                        let assetInBatch = await knex("assets").where({ batch: batch[0].id }).limit(1).select(["id"]);
                        if (assetInBatch[0]) {
                            hasAccess = await HasAccess({ type: "A", target: assetInBatch[0].id }, user);
                        }
                    } else {
                        hasAccess = true;
                    }
                }
                break;
            case "V":
                let video = await knex("videos").where({ id: result.target }).limit(1).select(["id", "channel"]);
                if (video[0] && video[0].channel) {
                    hasAccess = await HasAccess({ type: "C", target: video[0].channel })
                }
                break;
            default:
                break;
        }

        return hasAccess;

    } catch (e) {
        logger.error(e);
        return false;
    }
}

async function Exists(identifier) {
    let parts = identifier.split("-");
    if (parts.length != 2) {
        return false;
    }

    let result;

    try {

        switch (parts[0]) {
            case "C":
                result = await knex("channels").where({id: parts[1]}).limit(1).select("id");
                break;
            case "A":
                result = await knex("assets").where({id: parts[1]}).limit(1).select("id");
                break;
            case "B":
                result = await knex("batches").where({id: parts[1]}).limit(1).select("id");
                break;
            case "V":
                result = await knex("videos").where({id: parts[1]}).limit(1).select("id");
                break;
            default:
                logger.error(`Invalid identifier: ${identifier}`);
                break;
        }
    
        return result ? {id: result[0].id, type: parts[0], target: parts[1]} : false;

    } catch (e) {
        logger.error(e);
        return false;
    }
}

/**
 * 
 * @param {string} identifier 
 * @returns 
 */
function GetOptionsFromIdentifier(identifier) {
    if (!identifier) {
        return false;
    }
    let parts = identifier.split("-");
    if (parts.length != 2) {
        return false;
    }
    return {type: parts[0], target: parts[1]}
}

module.exports = { HasAccess, Exists, GetOptionsFromIdentifier }