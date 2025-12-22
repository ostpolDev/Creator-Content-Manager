import { PlayPlaylist } from "../player.js";

const createPlaylistModal = document.querySelector("#createPlaylistModal");
const createPlaylistButton = document.querySelector("#createPlaylistButton");
const playlistNameInput = document.querySelector("#playlistName");
const playlistModalButton = document.querySelector("#playlistModalButton");
const playlistPublicCheckbox = document.querySelector("#playlistPublicCheckbox");
const aboutText = document.querySelector("#aboutText");

playlistModalButton.addEventListener("click", () => {
    playlistNameInput.value = "";
    aboutText.value = "";
    playlistPublicCheckbox.checked = false;
    createPlaylistModal.classList.add("is-active");
    createPlaylistButton.disabled = true;
    playlistNameInput.focus();
})

playlistNameInput.addEventListener("input", () => {
    const val = playlistNameInput.value;
    const descriptionVal = aboutText.value;
    createPlaylistButton.disabled = !val.trim() || val.length > 128 || descriptionVal.length > 2048;
})

playlistNameInput.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        createPlaylistButton.click();
    }
})

createPlaylistButton.addEventListener("click", async () => {
    const name = playlistNameInput.value;
    const isPublic = playlistPublicCheckbox.checked;
    const description = aboutText.value;
    if (!name.trim() || name.length > 128 || description.length > 2048) {
        return;
    }

    try {

        const res = await fetch("/api/assets/playlists/add", {
            method: "POST",
            body: JSON.stringify({
                name, public: isPublic, description
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

        if (!json.playlist) {
            console.error("No playlist returned");
            return;
        }

        window.location = `/assets/playlists/v/${encodeURIComponent(json.playlist)}`;

    } catch (e) {
        console.error(e);
    }
    
})

const loadMoreButton = document.querySelector("#loadMoreButton");
const playlistBody = document.querySelector("#playlist");

function ResetAndLoad() {
    playlistBody.innerHTML = "";
    LoadMore();
}

async function LoadMore() {
    loadMoreButton.classList.remove("is-hidden");
    loadMoreButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/assets/playlists/list");
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        console.log(json);

        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }
        
        json.playlists.forEach(playlist => {
            playlistBody.appendChild(createPlaylistRowElement(playlist));
            // playlistBody.innerHTML += `
            //     <tr>
            //         <td>
            //             <div class="buttons">
            //                 <button class="button is-rounded iconButton">
            //                     <span class="icon"><span>playlist_play</span></span>
            //                 </button>
            //                 <button class="button is-rounded iconButton">
            //                     <span class="icon"><span>shuffle</span></span>
            //                 </button>
            //             </div>
            //         </td>
            //         <td><a href='/assets/playlists/v/${playlist.id}'>${playlist.title}</a></td>
            //         <td><a href='/users/v/${encodeURIComponent(playlist.author_username)}'>${playlist.author_display_name}</a></td>
            //         <td>0</td>
            //     </tr>
            // `;
        })

    } catch (e) {
        console.error(e);
    } finally {
        loadMoreButton.classList.remove("is-loading");
    }
}

ResetAndLoad();

function createPlaylistRowElement(playlist) {
    const row = document.createElement("tr");

    const actionElem = document.createElement("td");
    row.appendChild(actionElem);

    const buttons = document.createElement("div");
    buttons.className = "buttons";
    actionElem.appendChild(buttons);

    const playButton = document.createElement("button");
    playButton.classList.add("button", "is-rounded", "iconButton");
    buttons.appendChild(playButton);
    const playIcon = document.createElement("span");
    playIcon.className = "icon";
    playButton.appendChild(playIcon);
    const playIconText = document.createElement("span");
    playIconText.innerText = "playlist_play";
    playIcon.appendChild(playIconText);

    playButton.addEventListener("click", () => {
        PlayPlaylist(playButton, playlist.id, false);
    })

    const shuffleButton = document.createElement("button");
    shuffleButton.classList.add("button", "is-rounded", "iconButton");
    buttons.appendChild(shuffleButton);
    const shuffleIcon = document.createElement("span");
    shuffleIcon.className = "icon";
    shuffleButton.appendChild(shuffleIcon);
    const shuffleIconText = document.createElement("span");
    shuffleIconText.innerText = "shuffle";
    shuffleIcon.appendChild(shuffleIconText);

    shuffleButton.addEventListener("click", () => {
        PlayPlaylist(shuffleButton, playlist.id, true);
    })

    // const popoutButton = document.createElement("button");
    // popoutButton.classList.add("button", "is-rounded", "iconButton");
    // buttons.appendChild(popoutButton);
    // const popoutIcon = document.createElement("span");
    // popoutIcon.className = "icon";
    // popoutButton.appendChild(popoutIcon);
    // const popoutIconText = document.createElement("span");
    // popoutIconText.innerText = "picture_in_picture";
    // popoutIcon.appendChild(popoutIconText);

    // popoutButton.addEventListener("click", () => {

    // })

    const nameElement = document.createElement("td");
    row.appendChild(nameElement);

    const nameLink = document.createElement("a");
    nameLink.innerText = playlist.title;
    nameLink.href = `/assets/playlists/v/${encodeURIComponent(playlist.id)}`;
    nameElement.appendChild(nameLink);

    const authorElement = document.createElement("td");
    row.appendChild(authorElement);

    const authorLink = document.createElement("a");
    authorLink.innerText = playlist.author_display_name;
    authorLink.href = `/users/v/${encodeURIComponent(playlist.author_username)}`;
    authorElement.appendChild(authorLink);

    const sizeElement = document.createElement("td");
    sizeElement.innerText = (playlist.asset_count || 0).toLocaleString();
    row.appendChild(sizeElement);

    return row;
}
