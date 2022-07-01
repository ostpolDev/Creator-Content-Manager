function getAssetContext(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let menus = [];
    let isOwner = element.getAttribute("data-owner");

    menus.push({
        text: "View",
        event: (linkEvent, pointerEvent) => {
            let id = element.getAttribute("data-video");
            window.location = "/assets/v/"+encodeURIComponent(id);
        }
    })

    menus.push({
        text: "Download",
        event: (linkEvent, pointerEvent) => {
            let id = element.getAttribute("data-video");
            window.location = "/assets/download/"+encodeURIComponent(id);
        }
    })


    if (isOwner == "true") {
        menus.push({
            text: "Rename",
            event: (linkEvent, pointerEvent) => {
                console.log("Renaming asset");
                let id = element.getAttribute("data-video");
                
                let nameElement = element.querySelector(".assetName");
                let inputElement = element.querySelector(".assetRename");

                nameElement.classList.add("hidden");
                inputElement.classList.remove("hidden");

                inputElement.focus();
                inputElement.select();

                inputElement.addEventListener("focusout", defocus);
                inputElement.addEventListener("keydown", async (_e) => {
                    if (_e.key == "Enter") { // SUBMIT
                        let value = inputElement.value;
                        if (value && value.length > 2) {
                            let submitSuccess = await submitName(id, value);
                            if (submitSuccess) {
                                nameElement.innerText = value;
                                defocus();
                            }
                        }
                    }
                })

                function defocus() {
                    nameElement.classList.remove("hidden");
                    inputElement.classList.add("hidden");
                }
            }
        })
    }

   
    return menus;
}

function submitName(id, newName) {
    return new Promise((res) => {
        if (!id || !newName) {
            return res();
        }

        fetch("/api/assets/rename", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({asset: id, name: newName})
        }).then((_res) => {
            return _res.json();
        }).then((json) => {
            if (!json.success === true) {
                return res();
            }
            return res(true);
        }).catch((err) => {
            console.error(err);
            return res();
        })
    })
}

function getChannelContext(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let id = element.getAttribute("data-channel");
    let selected = element.getAttribute("data-channel-selected");

    let menus = [];

    if (id && selected == "false") {
        menus.push({
            text: "Switch",
            event: (linkEvent, pointerEvent) => {
                fetch("/api/channels/switch/"+encodeURIComponent(id), {
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
        })
    }

    return menus;
}

