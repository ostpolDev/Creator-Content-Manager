const axios = require('axios');

const SteamGame = require('../models/game');
const Video = require('../models/video');

const apiPath = "https://store.steampowered.com/api/appdetails?appids=";

const logger = require('./logger');

const getAndCreate = function(id, req) {
    let finalPath = apiPath + id;
    return new Promise((res) => {
        axios.get(finalPath).then((json) => {
            let data = json.data[id].data;
            SteamGame.findOne({"appId": id}).exec((err, game) => {
                if (err) {
                    logger.error(err);
                }
                let gameData = {
                    appType: data.type,
                    name: data.name,
                    appId: data.steam_appid,
                    description: {
                        detailed: data.detailed_description,
                        about: data.about_the_game,
                        short: data.short_description
                    },
                    dlc: data.dlc,
                    header: data.header_image,
                    website: data.website,
                    developers: data.developers,
                    publishers: data.publishers,
                    platforms: data.platforms,
                    categories: data.categories,
                    genres: data.genres,
                    screenshots: data.screenshots.map((x) => ({
                        id: x.id,
                        thumbnail: x.path_thumbnail,
                        full: x.path_full
                    })),
                    videos: data.movies,
                    releaseDate: data.release_date,
                    background: {
                        normal: data.background,
                        raw: data.background_raw
                    },
                    contentDescription: data.content_descriptors
                }
                if (game) {
                    game = {...game, ...gameData};
                    game.meta.lastUpdate = new Date();

                    game.save((err, _game) => {
                        if (err) {
                            logger.error(err);
                            res({success: false, error: err});
                        } else {
                            res({success: true, game: _game});
                        }
                    })
                } else {
                    let newSteamGame = new SteamGame({
                        ...gameData,
                        meta: {
                            addedBy: req ? req.user : undefined,
                            lastUpdate: new Date()
                        }
                    })

                    newSteamGame.save((err, game) => {
                        if (err) {
                            logger.error(err);
                            res({success: false, error: err});
                        } else {
                            res({success: true, game});
                        }
                    })
                }
            })
        }).catch(e => {
            logger.error(e);
            res({success: false, error: e});
        })
    })
}

const updateMetaInfo = function (id) {
    SteamGame.findById(id).exec((err, game) => {
        if (err) {
            logger.error(err);
        }
        if (game) {
            Video.countDocuments({games: game._id}).exec((err, count) => {
                if (err) {
                    logger.error(err);
                }
                game.meta.lastUpdate = new Date();
                game.meta.videos = count;

                game.save((err) => {
                    if (err) {
                        logger.error(err);
                    }
                })
            })
        }
    })
}

const updateGameInfo = async function (id, req) {
    return await getAndCreate(id, req);
}

module.exports = {getAndCreate, updateMetaInfo, updateGameInfo};