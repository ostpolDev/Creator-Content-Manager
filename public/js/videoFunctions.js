import { CreateSmartTimeString } from "./helpers.js";

function CreateVideoElement(video, size) {
    if (!size) {
        size = "one-fifth";
    }
    let column = document.createElement("div");
    column.classList.add("column", `is-${size}`);
    column.setAttribute("data-video", video.id);

    let linkElem = document.createElement("a");
    linkElem.href = `/videos/v/${video.id}`;
    linkElem.classList.add("hiddenLink");
    column.appendChild(linkElem);

    let cardElem = document.createElement("div");
    cardElem.classList.add("card");
    linkElem.appendChild(cardElem);

    let cardImageElem = document.createElement("div");
    cardImageElem.classList.add("card-image");
    cardElem.appendChild(cardImageElem);

    let cardFigure = document.createElement("figure");
    cardFigure.classList.add("image", "is-16by9", "is-rounded");
    cardImageElem.appendChild(cardFigure);

    let cardImage = document.createElement("img");
    cardImage.src = video.thumbnail_url || "/img/defaultThumbnail.webp";
    cardFigure.appendChild(cardImage);

    let cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    cardElem.appendChild(cardContent);

    let name = document.createElement("strong");
    name.innerText = video.title || video.id;
    cardContent.appendChild(name);

    let infoText = document.createElement("p");
    infoText.innerText = `${video.channel_name}`;
    cardContent.appendChild(infoText);

    let small = document.createElement("small");
    small.innerText = CreateSmartTimeString(video.created_at)
    small.title = CreateSmartTimeString(video.created_at, true)
    cardContent.appendChild(small)

    return column;
}

export { CreateVideoElement };
