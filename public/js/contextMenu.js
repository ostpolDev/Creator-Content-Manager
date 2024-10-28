import { RenameAssetElement } from "./assets/assetFunctions.js";

const contextMenu = document.getElementById("contextMenu");
const contextList = document.getElementById("contextList");

document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    
    if (contextMenu.classList.contains("active")) {
        contextMenu.style.opacity = "0";
        contextMenu.classList.remove("active")
        return;
    }

    contextList.innerHTML = "";
    PopulateContextMenu(e.target);
    
    let x = e.clientX;
    let y = e.clientY;

    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.opacity = "1";
    contextMenu.classList.add("active")
})

document.addEventListener("mousedown", (e) => {
    if (e.button != 0) {
        return;
    }

    if (contextMenu.classList.contains("active")) {
        setTimeout(() => {
            contextMenu.style.opacity = "0";
            contextMenu.classList.remove("active")
        }, 100)
    }
})

/**
 * 
 * @param {HTMLElement} target 
 */
function PopulateContextMenu(target) {
    MakeButton("upload", "Upload assets", null, "/assets/add");

    MakeDivider();
    
    let asset = target.closest("[data-asset]");
    if (asset) {
        MakeButton("visibility", "View", null, `/assets/v/${encodeURIComponent(asset.getAttribute("data-asset"))}`)
        MakeButton("edit", "Rename", () => {
            RenameAssetElement(asset.getAttribute("data-asset"));
        })
    }
}

/**
 * 
 * @param {string} icon 
 * @param {string} text 
 * @param {Function} callback 
 */
function MakeButton(icon, text, callback, href) {
    let button = document.createElement(href ? "a" : "button");
    button.classList.add("button");
    if (href) {
        button.href = href;
    }

    let iconElem = document.createElement("span");
    iconElem.classList.add("icon");
    button.appendChild(iconElem);

    let iconText = document.createElement("span");
    iconText.innerText = icon;
    iconElem.appendChild(iconText);

    let textElem = document.createElement("span");
    textElem.innerText = text;
    button.appendChild(textElem);

    if (callback) {
        button.addEventListener("click", callback);
    }
    contextList.appendChild(button);
    return button;
}

function MakeDivider() {
    let div = document.createElement("div");
    div.className = "divider";
    contextList.appendChild(div);
}
