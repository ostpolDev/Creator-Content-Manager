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

        let batchTitle = currentAsset.batch.name;

        let splits = batchTitle.split("-");
        let artist = currentAsset.batch.artist;
        if (!artist && splits.length > 1) {
            artist = splits[1];
        }
        
        showMusicPlayer({
            url: "/assets/getFile/"+encodeURIComponent(currentAsset._id),
            artist,
            title,
            cover: currentAsset.batch.cover.hasCover ? "/assets/batches/cover/"+encodeURIComponent(currentAsset.batch._id) : undefined,
            page: "/assets/v/"+encodeURIComponent(currentAsset._id)
        })
    }
}

async function showVideo(id) {
    currentAsset = await getAssetInfo(id);
    if (currentAsset) {
        setModal("video")
        toggleModalQuery("#mediaModal");
    }
}

async function showImage(id) {
    currentAsset = await getAssetInfo(id);
    if (currentAsset) {
        setModal("image")
        toggleModalQuery("#mediaModal");
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
    if (!id) {
        return;
    }
    return new Promise((res) => {
        fetch("/api/assets/get/info/"+encodeURIComponent(id)).then((res) => {
            return res.json();
        }).then(json => {
            if (json.success === true) {
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