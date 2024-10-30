import { MakeBatchElement } from "./batchFunctions.js";

const searchInput = document.getElementById("searchInput");

const typeButtons = document.querySelectorAll("button[data-type]");
const urlParams = new URLSearchParams(window.location.search);

const batchTableBody = document.getElementById("batchTableBody");
const batchTable = document.getElementById("batchTable");
const batchCards = document.getElementById("batchCards");
const batchCardsBody = document.getElementById("batchCardsBody");

const loadMoreButton = document.getElementById("loadMoreButton");

let type = urlParams.get("type") || "";
let skip = 0;
let query = urlParams.get("q") || "";

function ActivateType(selectedType, isFirst) {
    if (type == selectedType && !isFirst) {
        selectedType = "";
    }
    type = selectedType;
    skip = 0;
    GetTarget().innerHTML = "";
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

if (type) {
    ActivateType(type, true);
} else {
    LoadMore();
}

typeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        let t = btn.getAttribute("data-type");
        ActivateType(t);
    })
})

let searchTimer;
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        query = searchInput.value.trim();
        skip = 0;
        LoadMore();
    }, 500)
})

function GetTarget() {
    if (type == "album") {
        batchTableBody.innerHTML = "";
        batchTable.classList.add("is-hidden");
        batchCards.classList.remove("is-hidden");
        return batchCardsBody;
    } else {
        batchCardsBody.innerHTML = "";
        batchCards.classList.add("is-hidden");
        batchTable.classList.remove("is-hidden");
        return batchTableBody;
    }
}

function GetTypeString() {
    return type == "album" ? "card" : "list";
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

    let target = GetTarget();

    try {

        let body = {
            q: query,
            skip, type
        };
        
        let params = new URLSearchParams(body);
        let res = await fetch(`/api/batches/list?${params.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }

        let itemType = GetTypeString();

        skip += json.items.length;
        json.items.forEach(asset => {
            target.appendChild(MakeBatchElement(asset, itemType));
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false);
    }
}
