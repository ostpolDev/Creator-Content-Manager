function CreateGameElement(game, size) {
    if (!size) {
        size = "one-fifth";
    }
    let column = document.createElement("div");
    column.classList.add("column", `is-${size}`);
    column.setAttribute("data-game", game.id);

    let linkElem = document.createElement("a");
    linkElem.href = `/games/v/${game.id}`;
    linkElem.classList.add("hiddenLink");
    column.appendChild(linkElem);

    let cardElem = document.createElement("div");
    cardElem.classList.add("card");
    linkElem.appendChild(cardElem);

    let cardImageElem = document.createElement("div");
    cardImageElem.classList.add("card-image");
    cardElem.appendChild(cardImageElem);

    let cardImage = document.createElement("div");
    cardImage.classList.add("dynamic");
    cardImage.style.backgroundImage = `url('${game.image_url || "https://placehold.co/1280x720"}')`;
    cardImageElem.appendChild(cardImage);

    let cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    cardElem.appendChild(cardContent);

    let name = document.createElement("strong");
    name.innerText = game.name || game.id;
    cardContent.appendChild(name);

    if (game.developer) {
        let infoText = document.createElement("p");
        infoText.innerText = `${game.developer}`;
        cardContent.appendChild(infoText);
    }

    return column;
}

export { CreateGameElement };