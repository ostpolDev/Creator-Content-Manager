import { MakeButton } from "../helpers.js";
import { GetIconFromType, Interact } from "../assets/assetFunctions.js";

const searchInput = document.getElementById("searchInput");
const legalInfoButton = document.getElementById("legalInfoButton");

const currentAssetsContainer = document.getElementById("currentAssetsContainer");
const searchedAssetsContainer = document.getElementById("searchedAssetsContainer");

/**
 * 
 * @param {object} asset 
 * @param {"current"|"result"} direction 
 */
function MakeAssetItem(asset, direction) {
    let listItem = document.createElement("div");
    listItem.classList.add("list-item");
    listItem.setAttribute("data-asset", asset.id);
    listItem.setAttribute("data-asset-side", direction);

    let content = document.createElement("div");
    content.classList.add("list-item-content");
    listItem.appendChild(content);

    let title = document.createElement("div");
    title.classList.add("list-item-title");
    title.innerText = asset.name || asset.id;
    content.appendChild(title);

    let description = document.createElement("div");
    description.classList.add("list-item-description", "has-text-capitalized");
    description.innerText = `${asset.tags ? asset.tags : asset.type}`;
    content.appendChild(description);

    let controls = document.createElement("div");
    controls.classList.add("list-item-controls");
    listItem.appendChild(controls);

    let buttons = document.createElement("div");
    buttons.classList.add("buttons", "is-right");
    controls.appendChild(buttons);

    let viewButton = MakeButton(GetIconFromType(asset.type));
    buttons.appendChild(viewButton);
    viewButton.addEventListener("click", () => {
        Interact(viewButton, asset);
    })

    if (direction == "current") {
        let removeButton = MakeButton("delete");
        removeButton.addEventListener("click", async () => {
            await RemoveAsset(removeButton, asset.id);
            listItem?.remove();
        })
        buttons.appendChild(removeButton);
    } else {
        let addButton = MakeButton("add");
        addButton.addEventListener("click", async () => {
            await AddAsset(addButton, asset.id);
            listItem?.remove();
        })
        buttons.appendChild(addButton);
    }

    return listItem;
}

/**
 * 
 * @param {object} asset 
 * @param {"current"|"result"} direction 
 */
function InsertAssetItem(asset, direction) {
    (direction == "current" ? currentAssetsContainer : searchedAssetsContainer).appendChild(MakeAssetItem(asset, direction));
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 */
async function RemoveAsset(button, id) {
    await ModifyItem(button, id, "remove");
    ReloadCurrent();
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 */
async function AddAsset(button, id) {
    console.log("Adding asset");
    
    await ModifyItem(button, id, "add");
    ReloadCurrent();
}

let searchTimeout;
const loadingCurrent = document.getElementById("loadingCurrent");
const loadingSearch = document.getElementById("loadingSearch");

/**
 * 
 * @param {boolean} isLoading 
 * @param {"current"|"result"} direction 
 */
function SetLoading(isLoading, direction) {
    if (isLoading) {
        if (!direction || direction == "current") {
            loadingCurrent.classList.add("is-loading");
            loadingCurrent.classList.remove("is-hidden");
        }
        if (!direction || direction == "result") {
            loadingSearch.classList.add("is-loading");
            loadingSearch.classList.remove("is-hidden");
        }
    } else {
        if (!direction || direction == "current") {
            loadingCurrent.classList.remove("is-loading");
            loadingCurrent.classList.add("is-hidden");
        }
        if (!direction || direction == "result") {
            loadingSearch.classList.remove("is-loading");
            loadingSearch.classList.add("is-hidden");
        }
    }
}

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        Search();
    }, 300)
})

async function Search() {
    if (searchInput.value.trim() == "") {
        SetLoading(false, "result");
        searchedAssetsContainer.innerHTML = "";
        return;
    }

    SetLoading(true, "result");
    searchedAssetsContainer.innerHTML = "";

    try {

        let body = new URLSearchParams({
            limit: 8,
            q: searchInput.value.trim(),
            checkId: true
        })
        let res = await fetch(`/api/assets/list?${body.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            InsertAssetItem(item, "result");
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false, "result");
    }
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 * @param {"add"|"remove"} mode 
 */
async function ModifyItem(button, id, mode) {
    button.classList.add("is-loading");
    try {

        let res = await fetch("/api/videos/modifyAsset", {
            method: "POST",
            body: JSON.stringify({
                asset: id,
                mode,
                video: DEF.video
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

    } catch (e) {
        console.error(e);
    } finally {
        button.classList.remove("is-loading");
    }
}

async function ReloadCurrent() {
    currentAssetsContainer.innerHTML = "";
    SetLoading(true, "current");

    try {

        let res = await fetch(`/api/videos/assets/${encodeURIComponent(DEF.video)}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            InsertAssetItem(item, "current");
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false, "current");
    }
}

ReloadCurrent();
searchInput.value = "";

export { MakeButton }
