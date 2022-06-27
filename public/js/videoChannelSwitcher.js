let channelSelect = document.getElementById("channelSelect");
let moveButton = document.getElementById("moveButton");

moveButton.addEventListener("click", moveChannel);

function getChannels() {
    moveButton.disabled = channelSelect.disabled = true;
    channelSelect.innerHTML = "";

    fetch("/channels/getWithAccess?except="+encodeURIComponent(currentChannel)).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            json.channels.forEach(c => {
                channelSelect.innerHTML += `<option value="${c._id}">${c.name}</option>`
            })
            moveButton.disabled = channelSelect.disabled = false;
        }
    }).catch((err) => {
        console.error(err);
    })
}

getChannels();

function moveChannel() {
    let newChannel = channelSelect.value;
    fetch("/videos/move/"+encodeURIComponent(currentVideo), {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({channel: newChannel})
    }).then(res => {return res.json()}).then(json => {
        if (json.success === true) {
            window.location.reload();
        } else {
            console.log(json);
        }
    }).catch(err => {
        console.error(err);
    })
}