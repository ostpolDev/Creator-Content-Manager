import { removeEmpty } from "../helpers.js";

const playlistButton = document.querySelector("#playlistButton");
const playlistModal = document.querySelector("#playlistModal");
const playlistLoadMoreButton = playlistModal.querySelector("#playlistLoadMoreButton");
const createPlaylistButton = playlistModal.querySelector("#createPlaylistButton");
const playlistSearchInput = playlistModal.querySelector("#playlistSearchInput");
const playlistTableBody = playlistModal.querySelector("#playlistTableBody");

let searchTimeout;

playlistButton.addEventListener("click", () => {
    playlistSearchInput.value = "";
    ResetAndLoad();
    createPlaylistButton.setAttribute("disabled", true);
    playlistModal.classList.toggle("is-active");
})

playlistSearchInput.addEventListener("input", () => {
    const val = playlistSearchInput.value.trim();
    if (!val || val.length > 128) {
        createPlaylistButton.setAttribute("disabled", true)
    } else {
        createPlaylistButton.removeAttribute("disabled");
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        ResetAndLoad();
    }, 500)
})

playlistLoadMoreButton.addEventListener("click", () => {
    LoadMore();
})

let skip = 0;
let prevSkip = 0;

function ResetAndLoad() {
    playlistTableBody.innerHTML = "";
    skip = 0;
    LoadMore();
}

async function LoadMore() {
    playlistLoadMoreButton.classList.add("is-loading");
    playlistLoadMoreButton.classList.remove("is-hidden");

    try {

        const params = new URLSearchParams(removeEmpty({
            limit: 10,
            skip,
            q: playlistSearchInput.value,
            asset: DEF.asset || null,
            batch: DEF.batch || null
        }))

        const res = await fetch(`/api/assets/playlists/list?${params.toString()}`)
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        prevSkip = skip;
        skip += json.playlists.length;

        json.playlists.forEach(playlist => {
            playlistTableBody.appendChild(createPlaylistElement(playlist));
        })

        if (json.reachedEnd) {
            playlistLoadMoreButton.classList.add("is-hidden");
        }

    } catch (e) {
        console.error(e);
    } finally {
        playlistLoadMoreButton.classList.remove("is-loading")
    }
}

async function RefereshCurrent() {
    playlistTableBody.innerHTML = "";
    skip = prevSkip;
    await LoadMore();
}

ResetAndLoad();

function createPlaylistElement(playlist) {
    const tr = document.createElement("tr");

    const nameElement = document.createElement("td");
    tr.appendChild(nameElement);

    const nameLink = document.createElement("a");
    nameLink.innerText = playlist.title;
    nameLink.href = `/assets/playlists/v/${encodeURIComponent(playlist.id)}`;
    nameLink.target = "_BLANK";
    nameElement.appendChild(nameLink);

    const actionElement = document.createElement("td");
    actionElement.className = "buttons";
    tr.appendChild(actionElement);

    const addButton = document.createElement("button");
    addButton.classList.add("button", "is-rounded", "iconButton");
    actionElement.appendChild(addButton);
    const addIcon = document.createElement("span");
    addIcon.className = "icon";
    addButton.appendChild(addIcon);
    const addIconText = document.createElement("span");
    addIconText.innerText = playlist.is_included ? "remove" : "add";
    addIcon.appendChild(addIconText);

    addButton.addEventListener("click", () => {
        modifyAsset(addButton, playlist, playlist.is_included ? "remove" : "add");
    })

    return tr;
}

/**
 * 
 * @param {HTMLButtonElement} button 
 * @param {*} playlist 
 * @param {"add"|"remove"} mode 
 */
async function modifyAsset(button, playlist, mode) {
    if (button.classList.contains("is-loading")) {
        return;
    }

    button.classList.add("is-loading");
    try {

        let assets = [];

        if (!DEF.asset && DEF.batch) {

            const allRes = await fetch(`/api/batches/all/${DEF.batch}`);
            const allJSON = await allRes.json();

            if (!allJSON.success) {
                console.error(allJSON.msg || "Something went wrong...");
                return;
            }

            assets.push(...allJSON.assets);

        } else {
            assets.push(DEF.asset);
        }

        const res = await fetch("/api/assets/playlists/modifyAssets", {
            method: "POST",
            body: JSON.stringify({
                playlist: playlist.id,
                assets,
                mode
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        RefereshCurrent();

    } catch (e) {
        console.error(e);
    } finally {
        button.classList.remove("is-loading")
    }
}

createPlaylistButton.addEventListener("click", () => {
    CreateNewPlaylist();
})

async function CreateNewPlaylist() {
    const name = playlistSearchInput.value;
    if (!name.trim() || name.length > 128) {
        return;
    }

    if (createPlaylistButton.classList.contains("is-loading")) {
        return;
    }

    createPlaylistButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/assets/playlists/add", {
            method: "POST",
            body: JSON.stringify({
                name,
                isPublic: false,
                description: ""
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        const infoRes = await fetch(`/api/assets/playlists/list?id=${encodeURIComponent(json.playlist)}`);
        const infoJson = await infoRes.json();

        if (!infoJson.success || infoJson.playlists.length <= 0) {
            console.error(infoJson.msg || "Something went wrong...");
            await RefereshCurrent();
            playlistSearchInput.value = "";
            return;
        }

        const elem = createPlaylistElement(infoJson.playlists[0]);
        playlistTableBody.prepend(elem);
        playlistSearchInput.value = "";

    } catch (e) {
        console.error(e);
    } finally {
        createPlaylistButton.classList.remove("is-loading");
    }
}
