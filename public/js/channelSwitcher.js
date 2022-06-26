let switchChannel = document.getElementById("switchChannel");
if (switchChannel) {
    switchChannel.addEventListener("click", switchToChannel);
}

function switchToChannel(/**@type {MouseEvent} */ e) {
    let id = e.currentTarget.getAttribute("data-channel");

    fetch("/channels/switch/"+encodeURIComponent(id), {
        method: "POST"
    }).then(res => {
        return res.json();
    }).then(json => {
        if (json.success === true) {
            window.location.reload();
        }
    }).catch((err) => {
        console.error(err);
    })
}