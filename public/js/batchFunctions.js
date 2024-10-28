import { trimString } from "./assets/assetFunctions.js";
import { CreateSmartTimeString } from "./helpers.js";

/**
 * 
 * @param {object} batch 
 * @param {"list"|"card"} type 
 */
function MakeBatchElement(batch, type) {
    switch (type) {
        case "card":
            return makeCardElement(batch);
        case "list":
            return makeListElement(batch);
        default:
            return null;
    }
}

function makeListElement(batch) {
    let row = document.createElement("tr");
    row.setAttribute("data-batch", batch.id);

    let nameElem = document.createElement("td");
    let nameLink = document.createElement("a");
    nameLink.classList.add("hiddenLink");
    nameLink.href = `/assets/batches/v/${batch.id}`;
    nameLink.innerText = trimString(batch.name, 64);
    nameLink.title = batch.name;
    nameElem.appendChild(nameLink);
    row.appendChild(nameElem);

    let authorElem = document.createElement("td");
    let authorLink = document.createElement("a");
    authorLink.classList.add("hiddenLink");
    authorLink.innerText = batch.author_display_name;
    authorLink.href = `/users/v/${batch.author_username}`;
    authorElem.appendChild(authorLink);
    row.appendChild(authorElem);

    let uploadElem = document.createElement("td");
    if (!(batch.created_at instanceof Date)) {
        batch.created_at = new Date(batch.created_at);
    }
    uploadElem.innerText = CreateSmartTimeString(batch.created_at);
    uploadElem.title = CreateSmartTimeString(batch.created_at, true);
    row.appendChild(uploadElem);

    let assetsElem = document.createElement("td");
    let assetsText = document.createElement("span");
    assetsText.innerText = (batch.asset_count || 0).toLocaleString();
    assetsText.title = batch.asset_count;
    assetsElem.appendChild(assetsText);
    row.appendChild(assetsElem);

    return row;
}

function makeCardElement(batch) {
    let colElem = document.createElement("div");
    colElem.classList.add("column", "is-one-quarter");
    colElem.setAttribute("data-batch", batch.id);

    let linkElem = document.createElement("a");
    linkElem.classList.add("hiddenLink");
    linkElem.href = `/assets/batches/v/${batch.id}`;
    colElem.appendChild(linkElem);

    let card = document.createElement("div");
    card.classList.add("card");
    linkElem.appendChild(card);

    let cardImage = document.createElement("div");
    cardImage.classList.add("card-image");
    card.appendChild(cardImage);

    let figure = document.createElement("figure");
    figure.classList.add("image", "is-square");
    cardImage.appendChild(figure);

    let image = document.createElement("img");
    image.src = batch.image_url || `/img/defaultAlbum.webp`;
    figure.appendChild(image);

    let cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    card.appendChild(cardContent);

    let content = document.createElement("div");
    content.classList.add("content");
    cardContent.appendChild(content);

    let title = document.createElement("strong");
    title.innerText = batch.name;
    content.appendChild(title);

    let infoText = document.createElement("p");
    infoText.innerText = `${batch.asset_count.toLocaleString()} assets`;
    content.appendChild(infoText)

    let date = document.createElement("small");
    date.innerText = `Uploaded ${CreateSmartTimeString(batch.created_at)}`;
    date.title = CreateSmartTimeString(batch.created_at, true);
    content.appendChild(date);

    return colElem;
}

export { MakeBatchElement };
