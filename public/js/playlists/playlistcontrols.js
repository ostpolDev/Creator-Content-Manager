import { PlayPlaylist } from "../player.js";

const playlistPlay = document.getElementById("playlistPlay");
const playlistShuffle = document.getElementById("playlistShuffle");

playlistPlay.addEventListener("click", () => {
    PlayPlaylist(playlistPlay, DEF.playlist, false);
})

playlistShuffle.addEventListener("click", () => {
    PlayPlaylist(playlistShuffle, DEF.playlist, true);
})
