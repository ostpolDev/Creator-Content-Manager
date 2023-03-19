const axios = require('axios');
const logger = require('./logger');

const API_URL = "https://restcountries.com/v3.1/alpha/";
const FLAGS = "?fields=name,flag";

const GetCountryInfo = (code) => {
    return new Promise((res) => {
        let url = API_URL + encodeURIComponent(code) + FLAGS;
        axios.get(url).then(response => {
            res(response.data);
        }).catch(error => {
            logger.error(error);
            return res();
        })
    })
}

module.exports = {GetCountryInfo};
