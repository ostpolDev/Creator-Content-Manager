let searchInput = document.getElementById("searchInput");
let currentAccessContainer = document.getElementById("currentAssetContainer");
let newAccessContainer = document.getElementById("newAssetContainer");

searchInput.addEventListener("input", onSearchInput, false);

let timer;

function onSearchInput() {
    clear(newAccessContainer)
    clearTimeout(timer);
    timer = setTimeout(search.bind(this), 500);
}

function search() {
    let searchValue = searchInput.value;
    if (!searchValue || searchValue.length <= 1) {
        return;
    }
    console.log("Searching...");

    clear(newAccessContainer);
    let url = "/api/assets/search/"+encodeURIComponent(currentVideo)+"?q="+encodeURIComponent(searchValue);

    fetch(url).then((res) => {return res.json();}).then(json => {
        if (json.success === true) {
            json.assets.forEach(asset => {
                addToContainer(newAccessContainer, asset, false);
            })
        }
    }).catch((err) => {
        console.error(err);
    })
}

function clear(container) {
    container.innerHTML = "";
}

function addToContainer(container, asset, removeOnClick) {
    let id = asset._id;
    if (id == undefined) {
        id = asset.id;
    }
    let element = `
        <button class="button" data-context-name="View asset" data-context-link="/assets/v/${id}" data-context-target="_BLANK" onclick="${removeOnClick ? "removeAsset('" + id + "')" : "addAsset('" + id + "')"}">
            <span>${asset.meta.hasCustomName ? asset.name : asset.cleanName}</span>
        </button>
    `;

    container.innerHTML += element;
}

function getExistingAccess() {
    clear(currentAccessContainer);
    fetch("/api/videos/getAssets/"+currentVideo).then((res) => {
        return res.json();
    }).then(json => {
        if (json.success === true) {
            json.assets.forEach(asset => {
                addToContainer(currentAccessContainer, asset, true);
            })
        }
    }).catch((err) => {
        console.error(err);
    })
}

getExistingAccess();

function addAsset(id) {
    if (!id) {
        return;
    }
    fetch("/api/videos/addAsset", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({video: currentVideo, asset: id})
    }).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            clear(currentAccessContainer);
            clear(newAccessContainer);
            search();
            getExistingAccess();
        }
    }).catch(err => {
        console.error(err);
    })
}

function removeAsset(id) {
    if (!id) {
        return;
    }
    fetch("/api/videos/removeAsset", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({video: currentVideo, asset: id})
    }).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            clear(currentAccessContainer);
            clear(newAccessContainer);
            search();
            getExistingAccess();
        }
    }).catch(err => {
        console.error(err);
    })
}