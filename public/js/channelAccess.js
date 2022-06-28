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
    let url = "/api/channels/searchNewUsers/"+encodeURIComponent(currentChannel)+"?q="+encodeURIComponent(searchValue);

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
    let id = user._id;
    if (id == undefined) {
        id = user.id;
    }
    let element = `
        <button class="button" onclick="${removeOnClick ? "removeUser('" + id + "')" : "addUser('" + id + "')"}">
            <span>${user.username}</span>
        </button>
    `;

    container.innerHTML += element;
}

function getExistingAccess() {
    clear(currentAccessContainer);
    fetch("/api/channels/getAccessUsers/"+currentChannel).then((res) => {
        return res.json();
    }).then(json => {
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

function addUser(id) {
    if (!id) {
        return;
    }
    fetch("/api/channels/addAccess", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({channel: currentChannel, user: id})
    }).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            clear(currentAccessContainer);
            clear(newAccessContainer);
            search();
            getExistingAccess();
        }
    }).catch(err => {
        console.error(err);
    })
}

function removeUser(id) {
    if (!id) {
        return;
    }
    fetch("/api/channels/removeAccess", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({channel: currentChannel, user: id})
    }).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            clear(currentAccessContainer);
            clear(newAccessContainer);
            search();
            getExistingAccess();
        }
    }).catch(err => {
        console.error(err);
    })
}