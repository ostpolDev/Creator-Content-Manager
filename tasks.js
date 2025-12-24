require("dotenv").config();
const { knex } = require('./modules/database');

console.log("Running tasks for Creator-Content-Manager");

const start = Date.now();

async function Run() {

    try {

        await Recount();
        await RemoveStaleCachedNumbers();

    } catch (e) {
        console.error(e);
    } finally {
        console.log(`Finished in ${Date.now() - start}ms`)
        process.exit();
    }

}

Run();

async function Recount() {
    console.log("Recounting user stats");

    try {

        const proms = [];

        const users = await knex("users").select("id");

        for (let i = 0; i < users.length; i++) {
            proms.push(new Promise(async (res, rej) => {
                console.log(`Updating stats for ${users[i].id}`);

                try {

                    const assetCount = await knex("assets").where({added_by: users[i].id}).count("id as CNT");
                    const favoriteCount = await knex("asset_likes").where({user: users[i].id}).count("user as CNT");
                    await knex("users").where({id: users[i].id}).limit(1).update("asset_count", assetCount[0].CNT).update("favorite_count", favoriteCount[0].CNT);

                    return res();

                } catch (e) {
                    return rej(e);
                }

            }))
        }

        await Promise.all(proms);

    } catch (e) {
        console.error(e);
    }
}

async function RemoveStaleCachedNumbers() {
    console.log("Removing stale cached numbers");
    try {

        const checkDate = new Date();
        checkDate.setMinutes(checkDate.getMinutes() - 10);

        await knex("number_cache").where("created_at", "<", checkDate).delete();

    } catch (e) {
        console.error(e);
    }
}
