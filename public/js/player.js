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

function Play(asset) {
    return new Promise((res, rej) => {
        if (!asset) {
            musicPlayer.classList.add("is-hidden");
            ELEM.audio.pause();
            return res();
        }

        ELEM.title.innerText = asset.name || "";
        ELEM.subtitle.innerText = asset.batch_artist_name || formatString(asset.type);
        ELEM.linkButton.href = `/assets/v/${asset.id}`;

        
        
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
            return res();
        }
        ELEM.audio.onerror = (err) => {
            console.error(err);
            musicPlayer.classList.add("is-hidden");
            return res();
        }
        ELEM.audio.ontimeupdate = () => {
            updateProgressText(ELEM.audio.currentTime);
            ELEM.progress.value = ELEM.audio.currentTime;
        }
        ELEM.audio.onpause = () => {
            ELEM.playButtonIcon.innerText = "play_arrow";
        }
        ELEM.audio.onplay = () => {
            ELEM.playButtonIcon.innerText = "pause";
        }
        ELEM.audio.onended = () => {
            ELEM.playButtonIcon.innerText = "restart_alt"
        }

        ELEM.progress.value = 0;
    })
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

export { Play }
