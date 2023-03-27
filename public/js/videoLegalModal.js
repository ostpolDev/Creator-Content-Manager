const viewLegalInfoButtons = document.getElementById("viewLegalInfoButtons");
const legalInfoContent = document.getElementById("legalInfoContent");
const descriptionContent = document.getElementById("descriptionContent");
const viewGeneratedDescriptionButton = document.getElementById("viewGeneratedDescription");

viewLegalInfoButtons.addEventListener("click", () => {
    viewLegalInformation();
})

viewGeneratedDescriptionButton.addEventListener("click", () => {
    viewGeneratedDescription();
})

async function viewLegalInformation() {
    viewLegalInfoButtons.classList.add("loading");
    legalInfoContent.innerText = "";

    let res = await fetch("/api/videos/legalInfo/"+encodeURIComponent(VIDEO_ID));
    let json = await res.json();

    if (!json.success) {
        console.error(json.msg || "Something went wrong...");
        viewLegalInfoButtons.classList.remove("loading");
        return;
    }

    json.info.assets.forEach(asset => {
        if (asset.legalInfo) {
            legalInfoContent.innerText += `${asset.cleanName}:\n${asset.legalInfo}\n\n`;
        }
    })

    toggleModalQuery("#legalInfoModal")
    viewLegalInfoButtons.classList.remove("loading");
}

async function viewGeneratedDescription() {
    viewGeneratedDescriptionButton.classList.add("loading");
    descriptionContent.innerText = "";

    let res = await fetch("/api/channels/description/"+encodeURIComponent(VIDEO_ID));
    let json = await res.json();

    if (!json.success) {
        console.error(json.msg || "Something went wrong");
        viewGeneratedDescriptionButton.classList.remove("loading");
        return;
    }

    descriptionContent.innerText = json.description;
    viewGeneratedDescriptionButton.classList.remove("loading");
    toggleModalQuery("#descriptionModal");
}
