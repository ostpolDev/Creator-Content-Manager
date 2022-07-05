let musicPlayer = document.getElementById("musicPlayer");
let musicPlayerTime = document.getElementById("musicPlayerTime");
let musicPlayerProgress = document.getElementById("musicPlayerProgress");
let musicPlayerTotalTime = document.getElementById("musicPlayerTotalTime");
let musicPlayerPause = document.getElementById("musicPlayerPause");
let musicPlayerReplay = document.getElementById("musicPlayerReplay");
let musicPlayerClose = document.getElementById("musicPlayerClose");
let musicPlayerImage = document.getElementById("musicPlayerImage");

let playerSongName = document.getElementById("playerSongTitle");
let playerArtist = document.getElementById("playerArtist");
let playerImageLink = document.getElementById("playerImageLink");
let playerLink = document.getElementById("playerLink");

let playerPauseIcon = document.getElementById("playerPauseIcon");
let playerPlayIcon = document.getElementById("playerPlayIcon");

let isMusicPlayerShown = false;
let /** @type {HTMLAudioElement} */ audio = undefined;

let canSliderChange = true;
let hasChanged = false;
let isPressed = false;
let wasPaused = false;

document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") {
        stopMusicPlayer();
    }

    // if (e.key === "e") {
    //     showMusicPlayer({
    //         url:"http://127.0.0.1:5500/demo/hapi.wav",
    //         artist: "Alex Bär",
    //         title: "Hapi",
    //         cover: "https://placekitten.com/500/500",
    //         page: "#"
    //     });
    // }

    if (e.key === " ") {
        if (audio) {
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
            updatePauseButton();
        }
    }
})

function stopMusicPlayer() {
    showMusicPlayer();
}

musicPlayerProgress.addEventListener("change", (e) => {
    hasChanged = true;
    if (audio) {
        updateSongProgress();
    }
})

musicPlayerProgress.addEventListener("mousedown", (e) => {
    if (audio) {
        audio.pause();
        wasPaused = audio.paused;
    }
    isPressed = true;
    canSliderChange = false;
})

musicPlayerProgress.addEventListener("mouseup", (e) => {
    canSliderChange = true;
    
    if (isPressed && !hasChanged && audio && audio.paused) {
        if (!wasPaused) {
            audio.play();
        }
    }
    
    hasChanged = false;
    isPressed = false;
})

musicPlayerPause.addEventListener("click", pause);
musicPlayerReplay.addEventListener("click", replay);
musicPlayerClose.addEventListener("click", () => {showMusicPlayer()});

let previousInfo;

function showMusicPlayer(songInfo) {
    let show = true;
    if (!songInfo) {
        show = false;
    }

    console.log("Showing music player: " + show)
    isMusicPlayerShown = show;

    if (show) {
        musicPlayer.classList.add("active");
        musicPlayer.style.transform = "translateY(0px)";
    } else {
        musicPlayer.classList.remove("active");
        musicPlayer.style.transform = "translateY(160px)";
    }

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    if (show == false) {
        audio = undefined;
        document.dispatchEvent(new CustomEvent("musicPlayerClosed", {detail: {
            previous: previousInfo
        }}));
        return;
    } else {
        previousInfo = songInfo;
        document.dispatchEvent(new CustomEvent("musicPlayerOpened", {detail: {
            song: songInfo
        }}))
    }

    if (songInfo.cover) {
        musicPlayerImage.classList.remove("hidden");
        musicPlayer.classList.remove("noImage");
    } else {
        musicPlayerImage.classList.add("hidden");
        musicPlayer.classList.add("noImage");
    }

    musicPlayerLink.href = songInfo.page;

    playerSongName.innerText = songInfo.title;
    playerArtist.innerText = songInfo.artist;
    musicPlayerImage.src = songInfo.cover;
    playerImageLink.href = playerLink.href = songInfo.page;

    if (!songInfo.artist) {
        playerArtist.classList.add("hidden");
    } else {
        playerArtist.classList.remove("hidden");
    }

    audio = new Audio(songInfo.url);

    musicPlayerTotalTime.innerText = "00:00";
    musicPlayerTime.innerText = "00:00";

    audio.oncanplay = () => {
        if (!isMusicPlayerShown) {
            return;
        }
        musicPlayerTotalTime.innerText = formatTime(audio.duration);
        musicPlayerTime.innerText = formatTime(audio.currentTime);
        
        musicPlayerProgress.max = audio.duration;
        audio.play();
    }
    
    audio.ontimeupdate = () => {
        if (!isMusicPlayerShown) {
            return;
        }
        if (canSliderChange) {
            musicPlayerTime.innerText = formatTime(audio.currentTime);
            musicPlayerProgress.value = audio.currentTime;
        }
    }

    audio.onended = () => {
        updatePauseButton();
    }

    audio.onplay = () => {
        updatePauseButton();
    }
}

function pause() {
    if (audio && !audio.paused) {
        audio.pause();
    } else if (audio) {
        audio.play();
    }
    updatePauseButton();
}

function updatePauseButton() {
    if (audio && audio.paused) {
        playerPlayIcon.classList.remove("hidden");
        playerPauseIcon.classList.add("hidden");
    } else {
        playerPlayIcon.classList.add("hidden");
        playerPauseIcon.classList.remove("hidden");
    }
}

function replay() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play();
    }
}

function updateSongProgress() {
    let value = musicPlayerProgress.value;
    audio.pause();
    audio.currentTime = value;
    if (!wasPaused) {
        audio.play();
    }
    wasPaused = false;
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