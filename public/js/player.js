import { shuffleArray } from "./helpers.js";

const musicPlayer = document.getElementById("musicPlayer");

const ELEM = {
    art: musicPlayer.querySelector("#playerAlbumArt"),
    progress: musicPlayer.querySelector("#musicPlayerProgress"),
    playButton: musicPlayer.querySelector("#musicPlayButton"),
    playButtonIcon: musicPlayer.querySelector("#musicPlayButton>span.icon>span"),
    linkButton: musicPlayer.querySelector("#musicLinkButton"),
    closeButton: musicPlayer.querySelector("#musicCloseButton"),
    progressText: musicPlayer.querySelector("#musicProgressText"),
    title: musicPlayer.querySelector(".title"),
    subtitle: musicPlayer.querySelector(".subtitle"),
    audio: document.createElement("audio")
}

let wasPaused = false;
let isDragging = false;

ELEM.progress.addEventListener("input", (e) => {
    if (!isDragging) {
        wasPaused = ELEM.audio.paused;
        isDragging = true;
    }
    ELEM.audio.pause();
    updateProgressText(e.target.value)
})

ELEM.progress.addEventListener("change", (e) => {
    isDragging = false;
    ELEM.audio.currentTime = e.target.value;
    if (!wasPaused) {
        ELEM.audio.play();
    } else {
        setTimeout(() => {
            ELEM.audio.pause();

        }, 2)
    }
    updateProgressText(e.target.value)
})

ELEM.playButton.addEventListener("click", () => {
    if (ELEM.audio.ended) {
        ELEM.audio.currentTime = 0;
        ELEM.audio.play();
    }
    if (ELEM.audio.paused) {
        ELEM.audio.play();
    } else {
        ELEM.audio.pause();
    }
})

let buttonElement;

function Play(asset, onDone) {
    document.querySelector(`tr.active[data-asset]`)?.classList.remove("active");
    if (buttonElement) {
        updatePlayButton(buttonElement, false);
    }

    return new Promise((res, _) => {
        if (!asset) {
            musicPlayer.classList.add("is-hidden");
            ELEM.audio.pause();
            return res();
        }

        const tableElement = document.querySelector(`tr[data-asset='${asset.id}']`);

        ELEM.title.innerText = asset.name || "";
        ELEM.subtitle.innerText = asset.batch_artist_name || formatString(asset.type);
        ELEM.linkButton.href = `/assets/v/${asset.id}`;

        buttonElement = tableElement ? tableElement.querySelector("button[data-asset-button='play']") : null;
        
        if (asset.batch_image_url) {
            ELEM.art.src = asset.batch_image_url;
            ELEM.art.classList.remove("is-hidden");
        } else {
            ELEM.art.classList.add("is-hidden");
        }
    
        ELEM.audio.src = `/assets/get/${asset.id}`;
        ELEM.audio.currentTime = 0;
        ELEM.audio.oncanplay = () => {
            musicPlayer.classList.remove("is-hidden");
            ELEM.progress.max = ELEM.audio.duration;
            ELEM.audio.play();
            updateProgressText(0);
            tableElement?.classList.add("active");
            updatePlayButton(buttonElement, true);
            return res();
        }
        ELEM.audio.onerror = (err) => {
            console.error(err);
            musicPlayer.classList.add("is-hidden");
            tableElement?.classList.remove("active");
            updatePlayButton(buttonElement, false);
            return res();
        }
        ELEM.audio.ontimeupdate = () => {
            updateProgressText(ELEM.audio.currentTime);
            ELEM.progress.value = ELEM.audio.currentTime;
        }
        ELEM.audio.onpause = () => {
            ELEM.playButtonIcon.innerText = "play_arrow";
            updatePlayButton(buttonElement, false);
        }
        ELEM.audio.onplay = () => {
            ELEM.playButtonIcon.innerText = "pause";
            updatePlayButton(buttonElement, true);
        }
        ELEM.audio.onended = () => {
            ELEM.playButtonIcon.innerText = "restart_alt"
            tableElement?.classList.remove("active");
            updatePlayButton(buttonElement, false);
            if (onDone) {
                onDone();
            }
        }

        ELEM.progress.value = 0;
    })
}

let currentPlaylistIndex = 0;
let maxPlaylistIndex = 0;
let playlistIDS = [];

/**
 * 
 * @param {HTMLButtonElement?} button 
 * @param {string} playlistid 
 * @param {boolean} shuffle 
 */
async function PlayPlaylist(button, playlistid, shuffle) {
    console.log(`Playing playlist: ${playlistid} (Shuffle: ${shuffle})`);
    if (button) {
        button.classList.add("is-loading");
    }

    ELEM.closeButton?.click();

    currentPlaylistIndex = 0;
    maxPlaylistIndex = 0;
    playlistIDS = [];
    
    try {

        const params = new URLSearchParams({
            type: "music",
            playlist: playlistid
        });

        const res = await fetch(`/api/assets/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        playlistIDS = json.items.map(x => x.id);
        maxPlaylistIndex = json.items.length;
        if (shuffle) {
            shuffleArray(playlistIDS);
        }

        await progressPlaylist();
        
    } catch (e) {
        console.error(e);
    } finally {
        if (button) {
            button.classList.remove("is-loading");
        }
    }
}

async function progressPlaylist() {
    try {

        if (currentPlaylistIndex == maxPlaylistIndex) {
            console.log("Playlist done playing");
            return;
        }

        const item = playlistIDS[currentPlaylistIndex];
        
        const res = await fetch(`/api/assets/info/${encodeURIComponent(item)}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        currentPlaylistIndex++;

        Play(json.asset, () => {
            progressPlaylist();
        })

    } catch (e) {
        console.error(e);
    }
}

function updateProgressText(val) {
    ELEM.progressText.innerText = `${formatTime(val)} / ${formatTime(ELEM.audio.duration)}`
}

function formatTime(time) {
    if (!time) {
        return "00:00";
    }
    let date = undefined;
    if (time < 3600) {
        date = new Date(time * 1000).toISOString().substring(14, 19);
    } else {
        date = new Date(time * 1000).toISOString().substring(11, 16);
    }
    return date;
}

ELEM.closeButton.addEventListener("click", () => {
    Play(null);
})

function formatString(string) {
    const result = string.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * 
 * @param {HTMLButtonElement} buttonElement 
 * @param {boolean} isPlaying 
 * @returns 
 */
function updatePlayButton(buttonElement, isPlaying) {
    if (!buttonElement) {
        return;
    }
    const iconInfo = buttonElement.getAttribute("data-asset-button-icon");
    if (iconInfo) {
        const parts = iconInfo.split(":");
        buttonElement.querySelector("span span").innerText = parts[isPlaying ? 1 : 0];
    }
}

export { Play, PlayPlaylist }
