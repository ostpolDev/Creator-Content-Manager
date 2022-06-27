let searchInput = document.getElementById("searchInput");
let currentAccessContainer = document.getElementById("currentAccessContainer");
let newAccessContainer = document.getElementById("newAccessContainer");

function clear(container) {
    container.innerHTML = "";
}

function addToContainer(container, user, removeOnClick) {
    let element = `
        <button class="button" onclick="${removeOnClick ? "removeUser('" + user.id + "')" : "addUser('" + user.id + "')"}">
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