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
    cardImage.src = video.thumbnail_url || "https://placehold.co/1280x720";
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
    cardContent.appendChild(small);

    if (video.uploaded_at && !video.youtube_id) {
        const planned_release = new Date(video.uploaded_at);
        const diff = planned_release.getTime() - Date.now();
        const diffDays = Math.floor(diff / 1000 / 60 / 60 / 24);
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + diffDays);

        const tags = document.createElement("div");
        tags.classList.add("tags", "mt-1");
        cardContent.appendChild(tags);

        if (diffDays < 10) {
            const momentDate = moment(planned_release);

            const tag = document.createElement("span");
            tag.classList.add("tag");
            tag.innerText = `Releases ${momentDate.fromNow()}`;
            if (diffDays < 0) {
                tag.classList.add("is-warning")
                tag.innerText = `Supposed to release ${momentDate.fromNow()}`;
            } else if (diffDays < 2) {
                tag.classList.add("is-info");
                tag.innerText = `Releases ${momentDate.fromNow()}`;
            }
            tags.appendChild(tag);
        }
        
    }

    return column;
}

export { CreateVideoElement };
