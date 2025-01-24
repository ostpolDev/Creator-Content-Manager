import { CreateSmartTimeString } from "../helpers.js";

const userContainer = document.getElementById("userContainer");
const loadMoreButton = document.getElementById("loadMoreButton");
const searchInput = document.getElementById("searchInput");

let skip = 0;

function ResetAndLoad() {
    skip = 0;
    userContainer.innerHTML = "";
    LoadMore();
}

async function LoadMore() {
    loadMoreButton.classList.add("is-loading");
    loadMoreButton.classList.remove("is-hidden");

    try {

        const params = new URLSearchParams({
            skip,
            q: searchInput.value
        })

        const res = await fetch(`/api/users/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        skip += json.items.length;

        json.items.forEach(user => {
            userContainer.innerHTML += `
                <tr>
                    <td title="${user.username}"><a href="/users/v/${user.username}">${user.display_name}</a></td>
                    <td>${user.name || "--"}</td>
                    <td>${(user.asset_count || 0).toLocaleString()}</td>
                    <td title="${CreateSmartTimeString(user.created_at, true)}">${CreateSmartTimeString(user.created_at)}</td>
                </tr>
            `;
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

const urlParams = new URLSearchParams(window.location.search);
const focus = urlParams.get("focus");

if (focus == "search") {
    searchInput.focus();
    searchInput.select();
}

let searchTimeout;

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        ResetAndLoad();
    }, 200)
})

