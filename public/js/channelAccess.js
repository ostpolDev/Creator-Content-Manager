let searchInput = document.getElementById("searchInput");
let currentAccessContainer = document.getElementById("currentAccessContainer");
let newAccessContainer = document.getElementById("newAccessContainer");

searchInput.addEventListener("input", onSearchInput, false);

let timer;

function onSearchInput() {
    clear(newAccessContainer)
    clearTimeout(timer);
    timer = setTimeout(search.bind(this), 500);
}

function search() {
    let searchValue = searchInput.value;
    if (!searchValue || searchValue.length <= 2) {
        return;
    }
    console.log("Searching...");

    clear(newAccessContainer);
    let url = "/channels/searchNewUsers/"+encodeURIComponent(currentChannel)+"?q="+encodeURIComponent(searchValue);

    fetch(url).then((res) => {return res.json();}).then(json => {
        if (json.success === true) {
            json.users.forEach(u => {
                addToContainer(newAccessContainer, u, false);
            })
        }
    }).catch((err) => {
        console.error(err);
    })
}

function clear(container) {
    container.innerHTML = "";
}

function addToContainer(container, user, removeOnClick) {
    let element = `
        <button class="button" onclick="${removeOnClick ? "removeUser('" + user._id + "')" : "addUser('" + user._id + "')"}">
            <span>${user.username}</span>
        </button>
    `;

    container.innerHTML += element;
}

function getExistingAccess() {
    clear(currentAccessContainer);
    fetch("/channels/getAccessUsers/"+currentChannel).then((res) => {
        return res.json();
    }).then(json => {
        console.log(json)
        if (json.success === true) {
            json.users.forEach(u => {
                addToContainer(currentAccessContainer, u, true);
            })
        }
    }).catch((err) => {
        console.error(err);
    })
}

getExistingAccess();