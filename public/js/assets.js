import * as AssetFunctions from "./assets/assetFunctions.js";
import { Play } from "./player.js";

const typeButtons = document.querySelectorAll("button[data-type]");
const loadMoreButton = document.getElementById("loadMoreButton");
const assetList = document.getElementById("assetList");
const searchInput = document.getElementById("searchInput");
const playRandomButton = document.getElementById("playRandomButton");

const sort = document.getElementById("sort");
const order = document.getElementById("order");

let currentlyLoading = false;

sort?.addEventListener("input", () => {
    ResetAndLoad();
})
order?.addEventListener("input", () => {
    ResetAndLoad();
})

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
let currentType = "";
let skip = 0;
let query = urlParams.get("q") || "";
let ref = urlParams.get("ref") || "";

if (urlParams.has("focus")) {
    switch (urlParams.get("focus")) {
        case "search":
            document.querySelector("#searchInput")?.focus();
            break;
        default:
            break;
    }
}

let filter = assetList.getAttribute("data-filter");
const customAction = assetList.getAttribute("data-custom-action");

function ActivateType(selectedType, isFirst) {
    if (currentType == selectedType && !isFirst) {
        selectedType = "";
    }
    currentType = selectedType;
    typeButtons.forEach(btn => {
        let t = btn.getAttribute("data-type");
        if (selectedType && t == selectedType) {
            btn.classList.add("is-link");
        } else {
            btn.classList.remove("is-link")
        }
    })
    ResetAndLoad();
}

function ResetAndLoad() {
    assetList.innerHTML = "";
    skip = 0;
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
    const button = document.querySelector(`button[data-type='${type}']`);
    if (button) {
        button.click();
    } else {
        console.error(`Button not found for type: ${type}`);
        LoadMore();
    }
} else {
    LoadMore();
}

function SetLoading(isLoading) {
    currentlyLoading = isLoading;
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
            type: currentType,
            ref
        };

        if (sort) {
            body["sort"] = sort.value;
        }
        if (order) {
            body["order"] = order.value;
        }

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
            assetList.appendChild(AssetFunctions.MakeAssetElement(asset, customAction))
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false);
    }
}

window.addEventListener("scroll", (event) => {
    const { scrollHeight, scrollTop, clientHeight } = event.target.scrollingElement;
    if (!currentlyLoading && Math.abs(scrollHeight - clientHeight - scrollTop) < 250) {
        if (!loadMoreButton.classList.contains("is-hidden")) {
            loadMoreButton.click();
        }
    }
})

//#region Compact mode checkmark

const table = assetList.closest("table");
const compactCheck = document.getElementById("compactCheck");

if (table && compactCheck && window.localStorage) {
    const localStorageItem = localStorage.getItem("compact_lists");
    if (localStorageItem == "true") {
        compactCheck.checked = true;
    }

    compactCheck.addEventListener("input", () => {
        localStorage.setItem("compact_lists", compactCheck.checked.toString())
        checkChecked();
    })

    checkChecked();

    function checkChecked() {
        if (compactCheck.checked) {
            table.classList.add("compact")
        } else {
            table.classList.remove("compact");
        }
    }
}

//#endregion
