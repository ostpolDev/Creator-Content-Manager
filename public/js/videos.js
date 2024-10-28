const addVideoButton = document.getElementById("addVideoButton");
const youtubeId = document.getElementById("youtubeId");
const starring = document.getElementById("starring");
const starringResult = document.getElementById("starringResult");
const editors = document.getElementById("editors");
const editorsResult = document.getElementById("editorsResult");
const videoName = document.getElementById("videoName");

const createVideoButton = document.getElementById("createVideoButton");

const channelSelect = document.getElementById("channelSelect");

const urlParams = new URLSearchParams(window.location.search);

const currentFocus = urlParams.get("focus");

addVideoButton.addEventListener("click", () => {
    youtubeId.value = "";
    starring.value = "";
    editors.value = "";
    starringResult.value = "";
    editorsResult.value = "";
    videoName.value = "";
    videoName.removeAttribute("disabled");
    starringResult.parentElement.querySelector(".tags").innerHTML = "";
    editorsResult.parentElement.querySelector(".tags").innerHTML = "";
    SetModalOpen("#addVideoModal", true);
})

youtubeId.addEventListener("input", () => {
    if (youtubeId.value.trim() != "") {
        videoName.setAttribute("disabled", true);
    } else {
        videoName.removeAttribute("disabled");
    }
})

createVideoButton.addEventListener("click", () => {
    CreateVideo();
})

if (currentFocus == "add") {
    addVideoButton.click();
} else if (currentFocus == "search") {
    document.querySelector("#searchInput").focus();
}

if (localStorage.getItem("last_channel")) {
    channelSelect.value = localStorage.getItem("last_channel");
}

async function CreateVideo() {
    try {
        createVideoButton.classList.add("is-loading");

        let channel = channelSelect.value;
        let id = youtubeId.value;
        let edit = editorsResult.value;
        let star = starringResult.value;
        let name = videoName.value;

        if (!channel) {
            return;
        }

        let res = await fetch("/api/videos/add", {
            method: "POST",
            body: JSON.stringify({
                channel, id,
                editors: edit ? JSON.parse(edit) : null,
                starring: star ? JSON.parse(star) : null,
                name
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

        localStorage.setItem("last_channel", channel);

        window.location = `/videos/v/${encodeURIComponent(json.video)}`;
    } catch (e) {
        console.error(e);
        createVideoButton.classList.remove("is-loading");
    }
}
