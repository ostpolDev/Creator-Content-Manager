function CreateLikedWhenString(date) {
    return `Liked ${CreateSmartTimeString(date)}`;
}

function CreateSmartTimeString(date, isOpposite) {
    let timeString = "";

    let diff = Date.now() - new Date(date).getTime();
    if (diff >= 1000 * 60 * 60 * 24) {
        timeString = isOpposite === true ? moment(date).fromNow() : moment(date).format("Do MMMM YYYY HH:mm");
    } else {
        timeString = isOpposite === true ? moment(date).format("Do MMMM YYYY HH:mm") : moment(date).fromNow();
    }

    return timeString;
}

function MakeButton(icon, text, href) {
    let button = document.createElement(href ? "a" : "button");
    button.classList.add("button", "iconButton", "is-rounded");

    if (href) {
        button.href = href;
    }

    let iconElem = document.createElement("span");
    iconElem.classList.add("icon", "is-small");
    button.appendChild(iconElem);

    let iconText = document.createElement("span");
    iconText.innerText = icon;
    iconElem.appendChild(iconText);

    if (text) {
        let textElem = document.createElement("span");
        textElem.innerText = text;
        button.appendChild(textElem);
    }

    return button;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeEmpty(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}


export { CreateLikedWhenString, CreateSmartTimeString, MakeButton, escapeRegExp, removeEmpty, shuffleArray }
