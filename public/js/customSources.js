function getAssetContext(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let id = element.getAttribute("data-asset");
    let menus = [];
    let isOwner = element.getAttribute("data-owner");

    menus.push({
        text: "View",
        event: (linkEvent, pointerEvent) => {
            window.location = "/assets/v/"+encodeURIComponent(id);
        }
    })

    menus.push({
        text: "Download",
        event: (linkEvent, pointerEvent) => {
            window.location = "/assets/download/"+encodeURIComponent(id);
        }
    })

    menus.push({
        text: "Add to Collection",
        event: (linkEvent, pointerEvent) => {
            AddAssetToCollection(id);
        }
    })


    if (isOwner != undefined) {
        menus.push({
            text: "Rename",
            event: (linkEvent, pointerEvent) => {
                console.log("Renaming asset");

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

        menus.push({
            text: "Settings",
            event: () => {
                window.location = "/assets/settings/"+encodeURIComponent(id);
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

function submitBatchName(id, newName) {
    return new Promise((res) => {
        if (!id || !newName) {
            return res();
        }

        fetch("/api/batches/rename", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({batch: id, name: newName})
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

function getBatchContext(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let id = element.getAttribute("data-batch");
    let menus = [];
    let isOwner = element.getAttribute("data-owner");

    if (isOwner != undefined) {
        menus.push({
            text: "Rename",
            event: (linkEvent, pointerEvent) => {
                console.log("Renaming asset");

                let nameElement = element.querySelector(".batchName");
                let inputElement = element.querySelector(".batchRename");

                nameElement.classList.add("hidden");
                inputElement.classList.remove("hidden");

                inputElement.focus();
                inputElement.select();

                inputElement.addEventListener("focusout", defocus);
                inputElement.addEventListener("keydown", async (_e) => {
                    if (_e.key == "Enter") { // SUBMIT
                        let value = inputElement.value;
                        if (value && value.length > 2) {
                            let submitSuccess = await submitBatchName(id, value);
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

        menus.push({
            text: "Settings",
            event: () => {
                window.location = "/assets/batches/settings/"+encodeURIComponent(id);
            }
        })
    }

    return menus;
}

function getCoverSource(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let menus = [];
    let owner = element.getAttribute("data-owner");
    let id = element.getAttribute("data-batch");
    console.log(element, id, owner);
    if (owner != undefined) {
        menus.push({
            text: "Delete Cover Image",
            event: (linkEvent, pointerEvent) => {
                fetch("/api/batches/deleteCover/"+encodeURIComponent(id), {
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

const settings = ["general", "email", "password", "preferences"]

function getUserSettings(/**@type {MouseEvent} */ e, /**@type {HTMLElement} */ element) {
    let menus = [];

    settings.forEach(s => {
        menus.push({
            text: s,
            event: (linkEvent, pointerEvent) => {
                window.location = "/users/settings/"+encodeURIComponent(s.toLowerCase());
            }
        })

    })


    return menus;
}