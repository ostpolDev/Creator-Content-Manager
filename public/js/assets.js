import * as AssetFunctions from "./assets/assetFunctions.js";
import { Play } from "./player.js";

const typeButtons = document.querySelectorAll("button[data-type]");
const loadMoreButton = document.getElementById("loadMoreButton");
const assetList = document.getElementById("assetList");
const searchInput = document.getElementById("searchInput");
const playRandomButton = document.getElementById("playRandomButton");

playRandomButton?.addEventListener("click", async () => {
    try {
        playRandomButton.classList.add("is-loading");

        let res = await fetch("/assets/random?option=info&type=musicAndEffects");
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        Play(json.asset)
        
    } catch (e) {
        console.error(e);
    } finally {
        playRandomButton.classList.remove("is-loading");
    }
})

const urlParams = new URLSearchParams(window.location.search);

let type = urlParams.get('type') || "";
let skip = 0;
let query = urlParams.get("q") || "";
let ref = urlParams.get("ref") || "";

let filter = assetList.getAttribute("data-filter");

LoadMore();

function ActivateType(selectedType, isFirst) {
    if (type == selectedType && !isFirst) {
        selectedType = "";
    }
    type = selectedType;
    skip = 0;
    assetList.innerHTML = "";
    typeButtons.forEach(btn => {
        let t = btn.getAttribute("data-type");
        if (selectedType && t == selectedType) {
            btn.classList.add("is-link");
        } else {
            btn.classList.remove("is-link")
        }
    })
    LoadMore();
}

let searchTimer;
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        query = searchInput.value.trim();
        skip = 0;
        assetList.innerHTML = "";
        LoadMore();
    }, 500)
})

typeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        let t = btn.getAttribute("data-type");
        ref = btn.getAttribute("data-ref") || "";
        ActivateType(t);
    })
})

if (type) {
    ActivateType(type, true);
}

function SetLoading(isLoading) {
    if (isLoading) {
        loadMoreButton.classList.add("is-loading")
        loadMoreButton.classList.remove("is-outlined")
    } else {
        loadMoreButton.classList.remove("is-loading")
        loadMoreButton.classList.add("is-outlined")
    }
}

loadMoreButton.addEventListener("click", () => {
    LoadMore();
})

async function LoadMore() {
    SetLoading(true);
    loadMoreButton.classList.remove("is-hidden");

    try {

        let body = {
            q: query,
            skip,
            type,
            ref
        };

        if (filter) {
            let parts = filter.split(":");
            if (parts.length == 2) {
                body[parts[0]] = parts[1];
            }
        }

        let params = new URLSearchParams(body);

        let res = await fetch(`/api/assets/list?${params.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }

        skip += json.items.length;
        json.items.forEach(asset => {
            assetList.appendChild(AssetFunctions.MakeAssetElement(asset))
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false);
    }
}
