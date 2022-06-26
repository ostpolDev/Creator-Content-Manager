let switchChannel = document.getElementById("switchChannel");
let channelSelect = document.getElementById("channelSelect");

if (switchChannel) {
    switchChannel.addEventListener("click", (e) => {
        switchToChannel(e.currentTarget.getAttribute("data-channel"));
    });
}

if (channelSelect) {
    channelSelect.addEventListener("change", (e) => {
        switchToChannel(e.target.value);
    })
}


function switchToChannel(id) {
    if (!id) {
        return;
    }

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