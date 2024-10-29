import { CreateLikedWhenString, CreateSmartTimeString } from "../helpers.js";
import { Play } from "../player.js";

function MakeAssetElement(asset) {
    let row = document.createElement("tr");
    row.setAttribute("data-asset", asset.id);

    let actionElem = document.createElement("td");
    row.appendChild(actionElem);

    let buttons = document.createElement("div");
    buttons.classList.add("buttons");
    actionElem.appendChild(buttons);

    let interactButton = document.createElement("button");
    interactButton.classList.add("button", "is-rounded", "iconButton");
    let interactIcon = document.createElement("span");
    interactIcon.classList.add("icon");
    let interactIconText = document.createElement("span");
    interactIconText.innerText = GetIconFromType(asset.type);
    interactIcon.appendChild(interactIconText);
    interactButton.appendChild(interactIcon);
    buttons.appendChild(interactButton);
    interactButton.onclick = () => {
        Interact(interactButton, asset);
    }

    let downloadButton = document.createElement("a");
    downloadButton.classList.add("button", "is-rounded", "iconButton");
    downloadButton.href = `/assets/download/${asset.id}`

    let downloadIcon = document.createElement("span");
    downloadIcon.classList.add("icon");
    downloadButton.appendChild(downloadIcon);

    let downloadIconText = document.createElement("span");
    downloadIconText.innerText = "download";
    downloadIcon.appendChild(downloadIconText);
    buttons.appendChild(downloadButton);

    let likeButton = document.createElement("button");
    likeButton.classList.add("button", "is-rounded", "iconButton");
    if (asset.liked) {
        likeButton.classList.add("is-warning");
        if (asset.like_creation) {
            likeButton.title = CreateLikedWhenString(asset.like_creation);
        }
    }

    let likeButtonIcon = document.createElement("span");
    likeButtonIcon.classList.add("icon");

    let likeButtonIconText = document.createElement("span");
    likeButtonIconText.innerText = asset.liked ? "award_star" : "star";
    likeButtonIcon.appendChild(likeButtonIconText);
    likeButton.appendChild(likeButtonIcon);
    buttons.appendChild(likeButton);
    likeButton.addEventListener("click", () => {
        LikeAsset(likeButton, asset.id);
    })

    let nameElem = document.createElement("td");
    let nameLink = document.createElement("a");
    nameLink.classList.add("hiddenLink");
    nameLink.href = `/assets/v/${asset.id}`;
    nameLink.innerText = trimString(asset.name, 64);
    nameLink.title = asset.name;
    nameElem.appendChild(nameLink);
    row.appendChild(nameElem);

    let authorElem = document.createElement("td");
    let authorLink = document.createElement("a");
    authorLink.innerText = asset.author_display_name;
    authorLink.href = `/users/v/${asset.author_username}`;
    authorElem.appendChild(authorLink);
    row.appendChild(authorElem);

    let uploadElem = document.createElement("td");
    if (!(asset.created_at instanceof Date)) {
        asset.created_at = new Date(asset.created_at);
    }
    uploadElem.innerText = CreateSmartTimeString(asset.created_at);
    uploadElem.title = CreateSmartTimeString(asset.created_at, true);
    row.appendChild(uploadElem);

    let tagsElem = document.createElement("td");
    
    tagsElem.innerText = trimString(asset.tags || "--");
    if (asset.tags) {
        tagsElem.title = asset.tags;
    }
    row.appendChild(tagsElem);

    return row;
}

function trimString(string, limit) {
    if (typeof limit == "undefined") {
        limit = 32;
    }
    if (string.length < limit) {
        return string;
    }
    return string.substring(0, limit - 3) + "...";
}

function GetIconFromType(type) {
    switch (type) {
        case "soundEffect":
        case "music":
            return "play_arrow";
        case "image":
            return "image";
        case "video":
            return "movie";
        case "text":
            return "description";
        default:
            return "error";
    }
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 * @param {string} type 
 */
async function Interact(button, asset) {
    if (!asset) {
        return;
    }

    let id = asset.id;
    let type = asset.type;

    if (!id || !type) {
        return;
    }

    console.log(`Interacting with ${type} ${id}`);
    button.classList.add("is-loading");

    try {

        let json = await GetAssetInfo(id);

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        asset.name = json.asset.name;

        switch (type) {
            case "image":
                const imageModalImage = document.getElementById("imageModalImage");
                const imageModalLabel = document.getElementById("imageModalLabel");
                const imageModalLink = document.getElementById("imageModalLink");
                imageModalLabel.innerText = json.asset.name || "";
                imageModalImage.style.backgroundImage = `url('/assets/get/${id}')`;
                imageModalLink.href = `/assets/v/${id}`;
                imageModalImage.onclick = () => {window.location = `/assets/get/${id}`};
                SetModalOpen("#imageModal", true);
                break;
            case "video":
                const videoModalVideo = document.getElementById("videoModalVideo");
                const videoModalTitle = document.getElementById("videoModalTitle");
                const videoModalLink = document.getElementById("videoModalLink");
                videoModalTitle.innerText = json.asset.name || "";
                videoModalVideo.src = `/assets/get/${id}`;
                videoModalLink.href = `/assets/v/${id}`;
                let modal = SetModalOpen("#videoModal", true);
                modal.addEventListener("modalclose", () => {
                    videoModalVideo.pause();
                })
                videoModalVideo.play();
                break;
            case "music":
            case "soundEffect":
                await Play(asset);
                break;
            case "text":
                const textModalContent = document.getElementById("textModalContent");
                const textModalLink = document.getElementById("textModalLink");
                const textModalTitle = document.getElementById("textModalTitle");
                textModalLink.href = `/assets/v/${id}`;

                textModalTitle.innerText = json.asset.name || "";

                let content = await GetAssetContents(id);
                if (content) {
                    textModalContent.innerHTML = content;
                    SetModalOpen("#textModal", true);
                }
                
                break;
            default:
                console.error(`Invalid type: ${type}`);
                break;
        }

    } catch (e) {
        console.error(e);
    } finally {
        button.classList.remove("is-loading");
    }
}

async function GetAssetInfo(id) {
    let res = await fetch(`/api/assets/info/${id}`);
    let json = await res.json();
    return json;
}

async function GetAssetContents(id) {
    let res = await fetch(`/api/assets/info/${id}?type=content`);
    let json = await res.json();
    return json.content || undefined;
}

async function LikeAsset(button, id) {
    if (!button || !id) {
        return;
    }
    try {
        button.classList.add("is-loading");

        let res = await fetch("/api/assets/like", {
            method: "POST",
            body: JSON.stringify({
                asset: id
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        let json = await res.json();
        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        let newPostFetch = await fetch(`/api/assets/list?id=${encodeURIComponent(id)}`);
        let newPostResult = await newPostFetch.json();

        if (!newPostResult.success) {
            console.log(newPostResult.msg || "Something went wrong...");
            return;
        }

        let existingRow = document.querySelector(`[data-asset='${id}']`);
        if (existingRow) {
            existingRow.insertAdjacentElement("afterend", MakeAssetElement(newPostResult.items[0]));
            existingRow.remove();
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (button) {
            button.classList.remove("is-loading");
        }
    }
}

async function RenameAssetElement(id) {
    const targetElem = document.querySelector(`[data-asset="${id}"]`);
    if (!targetElem) {
        return;
    }

    try {

        let info = await GetAssetInfo(id);
        if (!info.success) {
            console.error(info.msg || "Something went wrong");
            return;
        }
        
        let nameElem = targetElem.querySelector("td>a.hiddenLink");
        let inputElem = document.createElement("input");
        inputElem.classList.add("input");
        inputElem.placeholder = info.asset.name;
        inputElem.value = info.asset.name;

        nameElem.classList.add("is-hidden");
        nameElem.insertAdjacentElement("afterend", inputElem);
        inputElem.focus();
        inputElem.select();

        inputElem.addEventListener("focusout", () => {
            inputElem?.remove();
            nameElem.classList.remove("is-hidden");
        })

        inputElem.addEventListener("keydown", async (e) => {
            if (e.key == "Escape") {
                inputElem?.remove();
                nameElem.classList.remove("is-hidden");
                return;
            }
            if (e.key == "Enter") {
                let val = inputElem.value;
                if (!val || val.trim().length <= 0 || val.length >= 255) {
                    return;
                }

                inputElem.classList.add("is-skeleton");
                inputElem.readOnly = true;

                try {
                    let res = await fetch("/api/assets/rename", {
                        method: "POST",
                        body: JSON.stringify({
                            asset: info.asset.id,
                            name: inputElem.value
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
                    nameElem.innerText = json.name;
                    inputElem?.remove();
                    nameElem.classList.remove("is-hidden");
                } catch (e) {
                    console.error(e);
                } finally {
                    inputElem?.remove();
                    nameElem.classList.remove("is-hidden");
                }
            }
        })

    } catch (e) {
        console.error(e);
    }
}

export { MakeAssetElement, trimString, GetIconFromType, Interact, GetAssetInfo, GetAssetContents, RenameAssetElement }
