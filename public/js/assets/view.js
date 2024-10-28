import { CreateLikedWhenString } from "../helpers.js";
import { GetAssetContents } from "./assetFunctions.js";

const placeholderButton = document.getElementById("placeholderButton");
if (placeholderButton) {
    LoadContent();
}

async function LoadContent() {
    let content = await GetAssetContents(DEF.asset);
    if (!content) {
        placeholderButton.classList.remove("is-loading");
        placeholderButton.classList.add("is-danger");
        placeholderButton.innerText = "Could not load file content";
        return;
    }

    let pre = document.createElement("pre");
    pre.classList.add("overflow");
    pre.innerText = content;
    placeholderButton.insertAdjacentElement("afterend", pre);
    placeholderButton.remove();
}

const likeButton = document.getElementById("likeButton");
const likeButtonIcon = likeButton.querySelector("span.icon>span");
let canLike = false;
if (likeButton) {
    CheckLiked();
}

likeButton.addEventListener("click", () => {
    if (canLike) {
        Like();
    }
})

async function CheckLiked() {
    try {
        let res = await fetch("/api/assets/isLiked/" + DEF.asset);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        UpdateLikeButton(json.isLiked, json.when);
        canLike = true;
    } catch (e) {
        console.error(e);
    }
}

function UpdateLikeButton(liked, when) {
    if (liked) {
        if (when) {
            likeButton.title = CreateLikedWhenString(when);
        }
        likeButton.className = "button is-rounded iconButton is-warning";
        likeButtonIcon.innerText = "award_star";
    } else {
        likeButton.title = "";
        likeButton.className = "button is-rounded iconButton";
        likeButtonIcon.innerText = "star";
    }
}

async function Like() {
    canLike = false;
    try {
        likeButton.classList.add("is-loading");

        let res = await fetch("/api/assets/like", {
            method: "POST",
            body: JSON.stringify({
                asset: DEF.asset
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong");
            return;
        }

        canLike = true;
        UpdateLikeButton(json.isLiked, new Date())

    } catch (e) {
        console.error(e);
    } finally {
        likeButton.classList.remove("is-loading");
    }
}

const deleteButton = document.getElementById("deleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const deleteModal = document.getElementById("deleteModal");

let hasDeletionRequest = false;

deleteModal.addEventListener("modalclose", () => {
    hasDeletionRequest = false;
})

deleteButton.addEventListener("click", () => {
    hasDeletionRequest = true;
    SetModalOpen("#deleteModal", true)
})

confirmDeleteButton.addEventListener("click", () => {
    if (!hasDeletionRequest) {
        return;
    }
    Delete();
})

async function Delete() {
    try {
        confirmDeleteButton.classList.add("is-loading");

        let res = await fetch("/api/assets/delete", {
            method: "POST",
            body: JSON.stringify({
                asset: DEF.asset
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

        if (json.hasBatch) {
            window.location = `/assets/batches/v/${DEF.batch}`
        } else {
            window.location = "/assets";
        }


    } catch (e) {
        console.error(e);
        confirmDeleteButton.classList.remove("is-loading");
    }
}
