let searchInput = document.getElementById("searchInput");
let currentAccessContainer = document.getElementById("currentGameContainer");
let newAccessContainer = document.getElementById("newGameContainer");

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
    let url = "/api/games/search/"+encodeURIComponent(currentVideo)+"?q="+encodeURIComponent(searchValue);

    fetch(url).then((res) => {return res.json();}).then(json => {
        if (json.success === true) {
            json.games.forEach(game => {
                addToContainer(newAccessContainer, game, false);
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
        <button class="button" data-context-name="View game" data-context-link="/games/v/${id}" data-context-target="_BLANK" onclick="${removeOnClick ? "removeAsset('" + id + "')" : "addAsset('" + id + "')"}">
            <span>${asset.name}</span>
        </button>
    `;

    container.innerHTML += element;
}

function getExistingAccess() {
    clear(currentAccessContainer);
    fetch("/api/videos/getGames/"+currentVideo).then((res) => {
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
    fetch("/api/videos/addGame", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({video: currentVideo, game: id})
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
    fetch("/api/videos/removeGame", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({video: currentVideo, game: id})
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