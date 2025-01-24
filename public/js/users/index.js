import { CreateSmartTimeString } from "../helpers.js";

const userContainer = document.getElementById("userContainer");
const loadMoreButton = document.getElementById("loadMoreButton");

let skip = 0;

async function LoadMore() {
    loadMoreButton.classList.add("is-loading");

    try {

        const params = new URLSearchParams({
            skip
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

