import { MakeAssetListItem } from "./assetFunctions.js";

const searchInput = document.getElementById("searchInput");

const currentAssetsContainer = document.getElementById("currentAssetsContainer");
const searchedAssetsContainer = document.getElementById("searchedAssetsContainer");

/**
 * 
 * @param {object} asset 
 * @param {"current"|"result"} direction 
 */
function InsertAssetItem(asset, direction) {
    (direction == "current" ? currentAssetsContainer : searchedAssetsContainer).appendChild(MakeAssetListItem(asset, direction, AddAsset, RemoveAsset));
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
        let res = await fetch(`/api/assets/list?${body.toString()}&resource=PUBLIC`);
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

        let res = await fetch("/api/assets/modifyReference", {
            method: "POST",
            body: JSON.stringify({
                toAsset: id,
                mode,
                fromAsset: DEF.asset
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

        let res = await fetch(`/api/assets/list?reference=${encodeURIComponent(DEF.asset)}`);
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
