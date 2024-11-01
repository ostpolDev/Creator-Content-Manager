import { MakeAssetListItem } from "../assets/assetFunctions.js";

const searchInput = document.getElementById("searchInput");

const currentAssetsContainer = document.getElementById("currentAssetsContainer");
const searchedAssetsContainer = document.getElementById("searchedAssetsContainer");

/**
 * 
 * @param {object} asset 
 * @param {"current"|"result"} direction 
 */
function InsertAssetItem(asset, direction) {
    (direction == "current" ? currentAssetsContainer : searchedAssetsContainer).appendChild(MakeAssetListItem(asset, direction, AddAsset, RemoveAsset));
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 */
async function RemoveAsset(button, id) {
    await ModifyItem(button, id, "remove");
    ReloadCurrent();
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 */
async function AddAsset(button, id) {
    console.log("Adding asset");
    
    await ModifyItem(button, id, "add");
    ReloadCurrent();
}

let searchTimeout;
const loadingCurrent = document.getElementById("loadingCurrent");
const loadingSearch = document.getElementById("loadingSearch");

/**
 * 
 * @param {boolean} isLoading 
 * @param {"current"|"result"} direction 
 */
function SetLoading(isLoading, direction) {
    if (isLoading) {
        if (!direction || direction == "current") {
            loadingCurrent.classList.add("is-loading");
            loadingCurrent.classList.remove("is-hidden");
        }
        if (!direction || direction == "result") {
            loadingSearch.classList.add("is-loading");
            loadingSearch.classList.remove("is-hidden");
        }
    } else {
        if (!direction || direction == "current") {
            loadingCurrent.classList.remove("is-loading");
            loadingCurrent.classList.add("is-hidden");
        }
        if (!direction || direction == "result") {
            loadingSearch.classList.remove("is-loading");
            loadingSearch.classList.add("is-hidden");
        }
    }
}

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        Search();
    }, 300)
})

async function Search() {
    if (searchInput.value.trim() == "") {
        SetLoading(false, "result");
        searchedAssetsContainer.innerHTML = "";
        return;
    }

    SetLoading(true, "result");
    searchedAssetsContainer.innerHTML = "";

    try {

        let body = new URLSearchParams({
            limit: 8,
            q: searchInput.value.trim(),
            checkId: true
        })
        let res = await fetch(`/api/assets/list?${body.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            InsertAssetItem(item, "result");
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false, "result");
    }
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {string} id 
 * @param {"add"|"remove"} mode 
 */
async function ModifyItem(button, id, mode) {
    button.classList.add("is-loading");
    try {

        let res = await fetch("/api/videos/modifyAsset", {
            method: "POST",
            body: JSON.stringify({
                asset: id,
                mode,
                video: DEF.video
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

    } catch (e) {
        console.error(e);
    } finally {
        button.classList.remove("is-loading");
    }
}

async function ReloadCurrent() {
    currentAssetsContainer.innerHTML = "";
    SetLoading(true, "current");

    try {

        let res = await fetch(`/api/videos/assets/${encodeURIComponent(DEF.video)}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach(item => {
            InsertAssetItem(item, "current");
        })

    } catch (e) {
        console.error(e);
    } finally {
        SetLoading(false, "current");
    }
}

ReloadCurrent();
searchInput.value = "";

//#region Legal info modal

const legalInfoButton = document.getElementById("legalInfoButton");
const incompatibleMessage = document.getElementById("incompatibleMessage");
const incompatibleList = document.getElementById("incompatibleList");
const legalInfoContent = document.getElementById("legalInfoContent");

const descriptionButton = document.getElementById("descriptionButton");

descriptionButton.addEventListener("click", () => {
    incompatibleMessage.classList.add("is-hidden");
    incompatibleList.innerHTML = "";
    legalInfoContent.innerHTML = "";
    MakeDescription();
})

legalInfoButton.addEventListener("click", () => {
    incompatibleMessage.classList.add("is-hidden");
    incompatibleList.innerHTML = "";
    legalInfoContent.innerHTML = "";
    ShowLegalSummary();
})

async function ShowLegalSummary() {
    legalInfoButton.classList.add("is-loading");

    try {

        let info = await GetLegalInfo();
        if (!info) {
            return;
        }
        
        info.infos.forEach(info => {
            MakeInfoElement(info, info.issues || {});
        })

        SetModalOpen("#legalInfoModal", true);

    } catch (e) {
        console.error(e);
    } finally {
        legalInfoButton.classList.remove("is-loading");
    }
}

function MakeInfoElement(info, issues, disableText) {
    // Info element
    if (info.text && info.text.trim() != "" && !disableText) {
        let p = document.createElement("p");
        p.innerText = info.text;
        legalInfoContent.appendChild(p);
    }

    // Check issues
    if (issues[info.id]) {
        let issue = issues[info.id];
        incompatibleMessage.classList.remove("is-hidden");

        let listElement = document.createElement("li");
        listElement.innerText = info.name;
        incompatibleList.appendChild(listElement);

        let subList = document.createElement("ul");
        listElement.appendChild(subList);

        issue.forEach(i => {
            let subListElement = document.createElement("li");
            subListElement.innerText = i;
            subList.appendChild(subListElement);
        })
    }
}

async function GetLegalInfo() {
    try {
        let res = await fetch("/api/videos/legal/" + encodeURIComponent(DEF.video));
        let json = await res.json();
        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return null;
        }
        return json;
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function MakeDescription() {
    try {

        descriptionButton.classList.add("is-loading");

        let res = await fetch(`/api/videos/description/${encodeURIComponent(DEF.video)}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            legalInfoContent.innerText = "This channel does not seem to have a description template set up.";
            SetModalOpen("#legalInfoModal", true);
            return;
        }

        let containsLegal = json.template.includes("[LEGAL]");
        let legalInfo;

        if (containsLegal) {
            let res = await GetLegalInfo();
            if (!res) {
                return;
            }
            let texts = [];
            res.infos.forEach(info => {
                MakeInfoElement(info, json.issues || {}, true);
                texts.push(info.text);
            })
            legalInfo = texts.join("\n\n");
        }

        const REPLACEMENT_MAP = {
            "TITLE": json.params.title,
            "EDITORS": json.params.editors,
            "STARRING": json.params.starring,
            "LEGAL": legalInfo
        }

        let newTemplate = json.template;

        Object.keys(REPLACEMENT_MAP).forEach(m => {
            let r = new RegExp(`\\[${escapeRegExp(m)}\\]`, "g");
            newTemplate = newTemplate.replace(r, REPLACEMENT_MAP[m]);
        })

        legalInfoContent.innerText = newTemplate;

        SetModalOpen("#legalInfoModal", true);

    } catch (e) {
        console.error(e);
    } finally {
        descriptionButton.classList.remove("is-loading");
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//#endregion
