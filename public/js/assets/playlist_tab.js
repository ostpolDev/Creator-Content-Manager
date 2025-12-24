const playlistAddToPlaylistButton = document.getElementById("playlistAddToPlaylistButton");
const playlistButton = document.getElementById("playlistButton");
const playlistTableBody = document.getElementById("playlistTabTableBody");
const loadMorePlaylistButton = document.getElementById("loadMorePlaylistButton");
const playlistModal = document.getElementById("playlistModal");

playlistAddToPlaylistButton.addEventListener("click", () => {
    playlistButton.click();
})

async function LoadPlaylists() {
    playlistTableBody.innerHTML = "";

    try {

        const params = new URLSearchParams({
            asset: DEF.asset,
            exclusive: true
        })

        const res = await fetch(`/api/assets/playlists/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.playlists.forEach(playlist => {
            const row = document.createElement("tr");
            row.setAttribute("data-playlist-entry", playlist.id);

            const name = document.createElement("td");
            row.appendChild(name);

            const nameLink = document.createElement("a");
            nameLink.href = `/assets/playlists/v/${encodeURIComponent(playlist.id)}`;
            nameLink.innerText = playlist.title;
            name.appendChild(nameLink);

            const buttons = document.createElement("td");
            buttons.classList.add("buttons");
            row.appendChild(buttons);
            
            const removeButton = document.createElement("button");
            removeButton.classList.add("button", "is-rounded", "iconButton");
            buttons.appendChild(removeButton);

            const removeButtonIcon = document.createElement("span");
            removeButtonIcon.classList.add("icon");
            removeButton.appendChild(removeButtonIcon);

            const removeButtonIconText = document.createElement("span");
            removeButtonIconText.innerText = "remove";
            removeButtonIcon.appendChild(removeButtonIconText);

            removeButton.addEventListener("click", () => {
                RemovePlaylistItem(removeButton, playlist.id);
            })

            playlistTableBody.appendChild(row);
        })
        
    } catch (e) {
        console.error(e);
    } finally {
        loadMorePlaylistButton.classList.remove("is-loading");
        loadMorePlaylistButton.classList.add("is-hidden");
    }
}

LoadPlaylists();

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 */
async function RemovePlaylistItem(button, id) {
    button.classList.add("is-loading");

    try {

        const res = await fetch("/api/assets/playlists/modifyAssets", {
            method: "POST",
            body: JSON.stringify({
                playlist: id,
                assets: [DEF.asset],
                mode: "remove"
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

        button.closest("tr")?.remove();

    } catch (e) {
        console.error(e);
    } finally {
        if (button) {
            button.classList.remove("is-loading");
        }
    }
}

playlistModal?.addEventListener("modalclose", () => {
    LoadPlaylists();
})
