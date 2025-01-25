import { CreateGameElement } from "../gameFunctions.js";

const gameContainer = document.getElementById("gameContainer");
const loadMoreButton = document.getElementById("loadMoreButton");
const searchInput = document.getElementById("searchInput");

let skip = 0;

function ResetAndLoad() {
    skip = 0;
    gameContainer.innerHTML = "";
    LoadMore();
}

async function LoadMore() {
    loadMoreButton.classList.remove("is-hidden");
    loadMoreButton.classList.add("is-loading");

    try {

        const params = new URLSearchParams({
            skip,
            q: searchInput.value
        })

        const res = await fetch(`/api/games/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        skip += json.items.length;

        json.items.forEach(game => {
            gameContainer.appendChild(CreateGameElement(game, "one-fifth"));
        })

        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }

    } catch (e) {
        console.error(e);
    } finally {
        loadMoreButton.classList.remove("is-loading");
    }
}

LoadMore();

let searchTimeout;

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        ResetAndLoad();
    }, 200)
})


const urlParams = new URLSearchParams(window.location.search);
const focus = urlParams.get("focus");

if (focus == "search") {
    searchInput.focus();
    searchInput.select();
}

//#region Adding games

const addGameButton = document.getElementById("addGameButton");
const importGameButton = document.getElementById("importGameButton");

const gameName = document.getElementById("gameName");
const gameDescription = document.getElementById("gameDescription");
const gameImage = document.getElementById("gameImage");
const developers = document.getElementById("developers");
const publishers = document.getElementById("publishers");
const tags = document.getElementById("tags");
const createGameButton = document.getElementById("createGameButton");
const gameWebsite = document.getElementById("gameWebsite");
const addGameTitle = document.getElementById("addGameTitle");

const steamGameButton = document.getElementById("steamGameButton");
const steamID = document.getElementById("steamID");

let currentMethod = "add";
let reference = undefined;

function ClearInputs() {
    gameName.value = "";
    gameDescription.value = "";
    gameImage.value = "";
    developers.value = "";
    publishers.value = "";
    tags.value = "";
    gameWebsite.value = "";
    createGameButton.querySelector(".text").innerText = "Add game";
    createGameButton.querySelector(".icon>span").innerText = "add";
    addGameTitle.innerText = "Add a new game";
    steamID.value = "";

    currentMethod = "add";
    reference = undefined;
}

addGameButton.addEventListener("click", () => {
    ClearInputs();
    SetModalOpen("#addGameModal", true);
})

if (focus == "steam") {
    ClearInputs();
    SetModalOpen("#importGameModal", true);
} else if (focus == "add") {
    ClearInputs();
    const ref = urlParams.get("ref");
    if (ref && !isNaN(ref)) {
        EditGame(ref);
    } else {
        SetModalOpen("#addGameModal", true);
    }

}

createGameButton.addEventListener("click", async () => {

    const name = gameName.value;
    if (!name) {
        return;
    }

    createGameButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/games/add", {
            method: "POST",
            body: JSON.stringify({
                name,
                description: gameDescription.value,
                image: gameImage.value,
                website: gameWebsite.value,
                developer: developers.value,
                publisher: publishers.value,
                tags: tags.value,
                formMethod: currentMethod,
                reference
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

        if (json.id) {
            window.location = `/games/v/${encodeURIComponent(json.id)}`;
        } else {
            window.location = "/games"
        }

    } catch (e) {
        console.error(e);
    } finally {
        createGameButton.classList.remove("is-loading");
    }
})

async function EditGame(id) {
    try {

        const res = await fetch(`/api/games/get/${encodeURIComponent(id)}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        ClearInputs();

        gameName.value = json.game.name;
        gameDescription.value = json.game.description || "";
        gameImage.value = json.game.image_url || "";
        developers.value = json.game.developer || "";
        publishers.value = json.game.publisher || "";
        tags.value = json.game.tags || "";
        gameWebsite.value = json.game.website || "";
        createGameButton.querySelector(".text").innerText = "Save game";
        createGameButton.querySelector(".icon>span").innerText = "save";
        addGameTitle.innerText = "Edit game";

        currentMethod = "edit";
        reference = id;

        SetModalOpen("#addGameModal", true);

    } catch (e) {
        console.error(e);
    }
}

importGameButton.addEventListener("click", () => {
    ClearInputs();
    SetModalOpen("#importGameModal", true);
})

steamGameButton.addEventListener("click", async () => {
    const id = steamID.value;
    if (!id) {
        return;
    }
    steamGameButton.classList.add("is-loading");
    try {

        const res = await fetch("/api/games/addSteam", {
            method: "POST",
            body: JSON.stringify({
                id
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong");
            if (json.redirect) {
                window.location = json.redirect;
            }
            return;
        }

        window.location = `/games/v/${encodeURIComponent(json.id)}`;

    } catch (e) {
        console.error(e);
    } finally {
        steamGameButton.classList.remove("is-loading");
    }
})


//#endregion
