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
    const public = playlistPublicCheckbox.checked;
    const description = aboutText.value;
    if (!name.trim() || name.length > 128 || description.length > 2048) {
        return;
    }

    try {

        const res = await fetch("/api/assets/playlists/add", {
            method: "POST",
            body: JSON.stringify({
                name, public, description
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

