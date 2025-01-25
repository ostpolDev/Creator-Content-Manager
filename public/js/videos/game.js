const gameSearchInput = document.getElementById("gameSearchInput");
const gameSearchResults = document.getElementById("gameSearchResults");
const existingGameContainer = document.getElementById("existingGameContainer");

let searchTimeout;

gameSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    gameSearchResults.innerHTML = "";
    if (gameSearchInput.value == "") {
        return;
    }
    searchTimeout = setTimeout(() => {
        Search();
    }, 200);
})

async function Search() {
    try {

        const params = new URLSearchParams({
            q: gameSearchInput.value
        })

        const res = await fetch(`/api/games/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            gameSearchResults.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td class="buttons">
                        <button class="button iconButton is-rounded" data-game='${item.id}'>
                            <span class="icon">
                                <span>add</span>
                            </span>
                        </button>
                    </td>
                </tr>
            `;
        })

        gameSearchResults.querySelectorAll("[data-game]").forEach(gameElem => {
            const gameId = gameElem.getAttribute("data-game");
            gameElem.addEventListener("click", () => {
                setGame(gameElem, gameId);
            })
        })

    } catch (e) {
        console.error(e);
    }
}

/**
 * 
 * @param {HTMLButtonElement} button 
 * @param {string} id 
 */
async function setGame(button, id) {
    if (button)
        button.classList.add("is-loading");

    try {

        const res = await fetch("/api/videos/setGame", {
            method: "POST",
            body: JSON.stringify({
                video: DEF.video,
                game: id
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

        RefreshCurrentGame();
        gameSearchResults.innerHTML = "";
        gameSearchInput.value = "";

    } catch (e) {
        console.error(e);
    } finally {
        if (button)
            button.classList.remove("is-loading");
    }
}

const gameThumbnail = document.getElementById("gameThumbnail");
const gameTitle = document.getElementById("gameTitle");
const viewGame = document.getElementById("viewGame");
const removeGame = document.getElementById("removeGame");

async function RefreshCurrentGame() {
    try {

        const res = await fetch(`/api/videos/getGame/${encodeURIComponent(DEF.video)}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        if (json.game) {
            gameThumbnail.style.backgroundImage = `url('${json.game.image_url}')`;
            gameTitle.innerText = json.game.name;
            viewGame.href = `/games/v/${encodeURIComponent(json.game.id)}`

            existingGameContainer.classList.remove("is-hidden");
        } else {
            existingGameContainer.classList.add("is-hidden");
        }

    } catch (e) {
        console.error(e);
    }
}

RefreshCurrentGame();

removeGame.addEventListener("click", async () => {
    removeGame.classList.add("is-loading");
    try {

        const res = await fetch("/api/videos/setGame", {
            method: "POST",
            body: JSON.stringify({
                video: DEF.video
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

        RefreshCurrentGame();

    } catch (e) {
        console.error(e);
    } finally {
        removeGame.classList.remove("is-loading");
    }
})
