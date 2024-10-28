const { knex } = require("./database");
const logger = require("./logger");

/**
 * 
 * @param {string} key 
 * @param {number} value 
 */
async function UpdateNumberIfOld(key, value) {
    try {
        let checkDate = new Date();
        checkDate.setMinutes(checkDate.getMinutes() - 10);
        
        logger.info(`Updating cached number ${key} to ${value}`)

        let res = await knex("number_cache").where({key}).where("updated_at", "<", checkDate).limit(1).update({value, updated_at: new Date()}, "key");
        if (!res[0]) {
            await knex("number_cache").insert({key, value});
        }
    } catch (e){
        logger.error(e);
    }
}

/**
 * 
 * @param {string} key 
 * @param {Function<number>} updateFunction 
 * @returns 
 */
async function GetCachedNumber(key, updateFunction) {
    try {
        let val = await knex("number_cache").where({key}).limit(1);
        if (!val[0]) {
            if (updateFunction) {
                let newVal = await updateFunction();
                await UpdateNumberIfOld(key, newVal);
                return newVal;
            }
            return 0;
        }
        let checkDate = new Date();
        checkDate.setMinutes(checkDate.getMinutes() - 10);

        if (val[0].updated_at.getTime() < checkDate && updateFunction) {
            let newVal = await updateFunction();
            await UpdateNumberIfOld(key, newVal);
            return newVal;
        }
        return val[0].value;
    } catch (e) {
        logger.error(e);
        return 0;
    }
}

module.exports = { UpdateNumberIfOld, GetCachedNumber }
