const addAssetButtons = document.querySelectorAll("[data-add-assets]");
const addAssetsModal = document.getElementById("addAssetsModal");
const assetSearch = document.getElementById("assetSearch");
const assetSearchBody = document.getElementById("assetSearchBody");

addAssetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        openAddModal();
    })
})

function openAddModal() {
    assetSearch.value = "";
    assetSearchBody.innerHTML = "";
    addAssetsModal.classList.toggle("is-active");
}

addAssetsModal.addEventListener("modalclose", () => {
    window.location.reload();
})

let searchInputCountdown;

assetSearch.addEventListener("keydown", () => {
    clearTimeout(searchInputCountdown);
    searchInputCountdown = setTimeout(() => {
        search();
    }, 500)
})


async function search() {
    const term = assetSearch.value;
    assetSearchBody.innerHTML = "";
    if (term.trim() == "") {
        return;
    }
    try {

        const params = new URLSearchParams({
            q: term,
            limit: 50,
            playlist: DEF.playlist,
            playlistMode: "optional"
        })
        const res = await fetch(`/api/assets/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            assetSearchBody.appendChild(createItemElement(item));
        })

    } catch (e) {
        console.error(e);
    }
}

function createItemElement(item) {
    const itemRow = document.createElement("tr");
    itemRow.setAttribute("data-item-id", item.id);

    const title = document.createElement("td");
    itemRow.appendChild(title);

    const itemLink = document.createElement("a");
    title.appendChild(itemLink);
    itemLink.target = "_BLANK";
    itemLink.href = `/assets/v/${encodeURIComponent(item.id)}`;
    itemLink.innerText = item.name;

    const actionLink = document.createElement("td");
    itemRow.appendChild(actionLink);
    actionLink.classList.add("buttons");

    const addButton = document.createElement("button");
    actionLink.appendChild(addButton);
    addButton.classList.add("button", "is-rounded", "iconButton");

    const addButtonIcon = document.createElement("span");
    addButton.appendChild(addButtonIcon);
    addButtonIcon.className = "icon";

    const addButtonIconText = document.createElement("span");
    addButtonIcon.appendChild(addButtonIconText);
    addButtonIconText.innerText = item.isInPlaylist ? "remove" : "add";

    addButton.addEventListener("click", () => {
        togglePlaylistItem(addButton, item);
    })

    return itemRow;
}

async function togglePlaylistItem(button, item) {
    button.classList.add("is-loading");
    try {

        const res = await fetch("/api/assets/playlists/modifyAssets", {
            method: "POST",
            body: JSON.stringify({
                playlist: DEF.playlist,
                assets: [item.id],
                mode: item.isInPlaylist ? "remove" : "add"
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

        item.isInPlaylist = !item.isInPlaylist;
        const existingElement = document.querySelector(`[data-item-id='${item.id}']`);
        if (existingElement) {
            existingElement.insertAdjacentElement("afterend", createItemElement(item));
            existingElement.remove();
        }

    } catch (e) {
        console.error(e);
    } finally {
        button.classList.remove("is-loading");
    }
}

