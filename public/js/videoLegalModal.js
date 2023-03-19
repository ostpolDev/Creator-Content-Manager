const viewLegalInfoButtons = document.getElementById("viewLegalInfoButtons");
const legalInfoContent = document.getElementById("legalInfoContent");

viewLegalInfoButtons.addEventListener("click", () => {
    viewLegalInformation();
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