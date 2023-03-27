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

    descriptionContent.innerHTML = replace_content(json.description);
    viewGeneratedDescriptionButton.classList.remove("loading");
    toggleModalQuery("#descriptionModal");
}

function replace_content(content) {
    var exp_match = /(\b(https?|):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var element_content=content.replace(exp_match, "<a href='$1' target='_BLANK'>$1</a>");
    var new_exp_match =/(^|[^\/])(www\.[\S]+(\b|$))/gim;
    var new_content=element_content.replace(new_exp_match, '$1<a target="_blank" href="http://$2">$2</a>');
    return new_content;
}
