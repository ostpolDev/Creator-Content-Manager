const logger = require("./logger");

const API_URL = "https://restcountries.com/v3.1/alpha/";
const FLAGS = "?fields=name,flag";

async function GetCountryInfo(code) {
    if (!code) {
        return;
    }

    try {
        const URL = API_URL + encodeURIComponent(code.trim().toLowerCase()) + FLAGS;
        let res = await fetch(URL);
        let json = await res.json();

        return {
            code: code.trim().toLowerCase(),
            name: json.name.common,
            official: json.name.official,
            flag: json.flag
        }

    } catch (e) {
        logger.error(e);
        return null;
    }
}

module.exports = {GetCountryInfo};
