import { MakeButton } from "../helpers.js";

const userSearchInput = document.getElementById("userSearchInput");
const userBody = document.getElementById("userBody");
const membersLoading = document.getElementById("membersLoading");

const ACCESS_MAP = {
    "-1": "Creator",
    "0": "Default",
    "1": "Content Manager"
}

async function RefreshUsers() {
    userBody.innerHTML = "";
    membersLoading.classList.remove("is-hidden");

    try {

        let res = await fetch(`/api/channels/members/${encodeURIComponent(DEF.channel)}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(user => {
            userBody.appendChild(MakeUserObject(user));
        })

    } catch (e) {
        console.error(e);
    } finally {
        membersLoading.classList.add("is-hidden");
    }
}

RefreshUsers();

function MakeUserObject(user) {
    let listItem = document.createElement("div");
    listItem.classList.add("list-item");
    listItem.setAttribute("data-user", user.username);

    let imageContainer = document.createElement("div");
    imageContainer.classList.add("list-item-image");
    listItem.appendChild(imageContainer);

    let figure = document.createElement("figure");
    figure.classList.add("image", "is-64x64");
    imageContainer.appendChild(figure);

    let img = document.createElement("img");
    img.classList.add("is-rounded");
    img.src = user.profile_image_url;
    figure.appendChild(img);

    let content = document.createElement("div");
    content.classList.add("list-item-content");
    listItem.appendChild(content);

    let title = document.createElement("div");
    title.classList.add("list-item-title");
    title.innerText = user.display_name;
    content.appendChild(title);

    let description = document.createElement("div");
    description.classList.add("list-item-description", "has-text-capitalized");
    description.innerText = `${ACCESS_MAP[user.access_level.toString()] || user.access_level}`;
    content.appendChild(description);

    let controls = document.createElement("div");
    controls.classList.add("list-item-controls");
    listItem.appendChild(controls);

    let buttons = document.createElement("div");
    buttons.classList.add("buttons", "is-right");
    controls.appendChild(buttons);

    let viewButton = MakeButton("visibility", null, `/users/v/${user.username}`);
    buttons.appendChild(viewButton);

    if (!user.isAuthor && !user.isUser && user.level != -1) {
        let removeButton = MakeButton("delete");
        buttons.appendChild(removeButton);
    }

    return listItem;
}
