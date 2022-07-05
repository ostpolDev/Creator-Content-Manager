const mediaModal = document.getElementById("mediaModal");
const mediaModalImage = document.getElementById("mediaModalImage");
/**@type {HTMLVideoElement} */
const mediaModalVideo = document.getElementById("mediaModalVideo");
const mediaModalName = document.getElementById("mediaModalName");
const mediaModalViewButton = document.getElementById("mediaModalViewButton");

let currentAsset;

async function playAsset(id) {
    currentAsset = await getAssetInfo(id);
    if (currentAsset) {
        let title = currentAsset.meta.hasCustomName ? currentAsset.name : currentAsset.cleanName;
        
        // let batchTitle = currentAsset.batch.name;

        let splits = title.split("-");
        let artist = currentAsset.artist ? currentAsset.artist : currentAsset.batch.artist;
        if (!artist && splits.length > 1) {
            artist = splits[0];
            splits.shift()
            title = splits.join(" - ")
        }
        
        showMusicPlayer({
            url: "/assets/getFile/"+encodeURIComponent(currentAsset._id),
            artist,
            title,
            cover: currentAsset.batch.cover.hasCover ? "/assets/batches/cover/"+encodeURIComponent(currentAsset.batch._id) : undefined,
            page: "/assets/v/"+encodeURIComponent(currentAsset._id),
            id
        })
    }
}

let prev;

document.addEventListener("musicPlayerClosed", (e) => {
    setButtonActive(e.detail.previous.id, false)
})

document.addEventListener("musicPlayerOpened", (e) => {
    if (prev && prev != e.detail.song.id) {
        setButtonActive(prev, false);
    }
    prev = e.detail.song.id;
    setButtonActive(e.detail.song.id, true)
})

function setButtonActive(id, isActive) {
    let object = document.getElementById("assetItem-"+id);
    if (object) {
        let buttonObject = object.querySelector(".playButton");
        if (buttonObject) {
            if (isActive) {
                buttonObject.classList.add("warning");
            } else {
                buttonObject.classList.remove("warning");
            }
        }
    }
}


function playRandomAsset() {
    playAsset();
}

async function showVideo(id) {
    currentAsset = await getAssetInfo(id);
    if (currentAsset) {
        setModal("video")
        toggleModalQuery("#mediaModal");
        stopMusicPlayer();
    }
}

async function showImage(id) {
    currentAsset = await getAssetInfo(id);
    if (currentAsset) {
        setModal("image")
        toggleModalQuery("#mediaModal");
        stopMusicPlayer();
    }
}

function setModal(type) {
    if (type == "video") {
        mediaModalVideo.classList.remove("hidden");
        mediaModalImage.classList.add("hidden");

        mediaModalVideo.src = "/assets/getFile/"+encodeURIComponent(currentAsset._id);
    } else if (type == "image") {
        mediaModalVideo.classList.add("hidden");
        mediaModalImage.classList.remove("hidden");

        mediaModalImage.src = "/assets/getFile/"+encodeURIComponent(currentAsset._id);
        mediaModalImage.alt = currentAsset.name;
    }

    mediaModalName.innerText = currentAsset.meta.hasCustomName ? currentAsset.name : currentAsset.cleanName;
    mediaModalViewButton.href = "/assets/v/"+encodeURIComponent(currentAsset._id);
}

function getAssetInfo(id) {
    console.log("Getting asset info");
    return new Promise((res) => {
        let query = "/api/assets/get/info/"+encodeURIComponent(id);
        if (!id) {
            console.log("No ID provided. Playing random asset");
            query = "/api/assets/get/random/info/music"
        }
        fetch(query).then((res) => {
            return res.json();
        }).then(json => {
            if (json.success === true) {
                console.log(`Found info for asset ${json.asset._id} ("${json.asset.name}")`);
                return res(json.asset);
            }
            return res(undefined);
        }).catch((err) => {
            console.error(err);
            return res(undefined);
        })
    })
}

document.addEventListener("modalClose", (e) => {
    let modal = e.detail.element;
    if (modal == mediaModal) {
        mediaModalVideo.pause();
    }
})