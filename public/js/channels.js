const addChannelButton = document.getElementById("addChannelButton");
const channelUsername = document.getElementById("channelHandle");
const submitChannelButton = document.getElementById("submitChannelButton");
const channelVideosCheck = document.getElementById("channelVideosCheck");

addChannelButton.addEventListener("click", () => {
    channelUsername.value = "";
    channelVideosCheck.checked = true;
    SetModalOpen("#addModal", true);
    channelUsername.focus();
})

channelUsername.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        submitChannelButton.click();
    }
})

submitChannelButton.addEventListener("click", () => {
    AddChannel();
})

const urlParams = new URLSearchParams(window.location.search);
const currentFocus = urlParams.get("focus");

if (currentFocus == "add") {
    addChannelButton.click();
}

async function AddChannel() {
    let username = channelUsername.value;
    if (!username || username.trim() == "" || username.length > 512) {
        return;
    }

    submitChannelButton.classList.add("is-loading");

    try {

        let res = await fetch("/api/channels/add", {
            method: "POST",
            body: JSON.stringify({
                username,
                getVideos: channelVideosCheck.checked
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

        SetModalOpen("#addModal", false);
        ResetAndLoad();

    } catch (e) {
        console.error(e);
    } finally {
        submitChannelButton.classList.remove("is-loading");
    }
}

const channelContainer = document.getElementById("channelContainer");
const loadMoreButton = document.getElementById("loadMoreButton");

let q = "";
let skip = 0;

function ResetAndLoad() {
    channelContainer.innerHTML = "";
    skip = 0;
    q = "";
    LoadMore();
}
ResetAndLoad();

async function LoadMore() {
    loadMoreButton.classList.remove("is-hidden");
    loadMoreButton.classList.add("is-loading");

    try {

        let body = new URLSearchParams({
            q,
            skip
        });

        let res = await fetch(`/api/channels/list?${body.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        skip += json.items.length;
        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }

        json.items.forEach(channel => {
            channelContainer.appendChild(MakeChannelElement(channel));
        })

    } catch (e) {
        console.error(e);
    } finally {
        loadMoreButton.classList.remove("is-loading");
    }
}

function MakeChannelElement(channel) {
    let column = document.createElement("div");
    column.classList.add("column", "is-one-fifth");
    column.setAttribute("data-channel", channel.id);

    let linkElem = document.createElement("a");
    linkElem.href = `/channels/v/${channel.id}`;
    linkElem.classList.add("hiddenLink");
    column.appendChild(linkElem);

    let cardElem = document.createElement("div");
    cardElem.classList.add("card");
    linkElem.appendChild(cardElem);

    let cardImageElem = document.createElement("div");
    cardImageElem.classList.add("card-image");
    cardElem.appendChild(cardImageElem);

    let cardFigure = document.createElement("figure");
    cardFigure.classList.add("image", "is-256x256", "is-rounded");
    cardImageElem.appendChild(cardFigure);

    let cardImage = document.createElement("img");
    cardImage.src = channel.image_url;
    cardFigure.appendChild(cardImage);

    let cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    cardElem.appendChild(cardContent);

    let name = document.createElement("strong");
    name.innerText = channel.name;
    cardContent.appendChild(name);

    let infoText = document.createElement("p");
    infoText.innerText = `${channel.handle}`;
    cardContent.appendChild(infoText);

    return column;
}
