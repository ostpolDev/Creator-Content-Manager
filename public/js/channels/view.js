const refreshButton = document.getElementById("refreshButton");

refreshButton?.addEventListener("click", () => {
    if (refreshButton.hasAttribute("disabled")) {
        return;
    }

    UpdateChannel();
})

async function UpdateChannel() {
    refreshButton.classList.add("is-loading");
    try {

        let res = await fetch("/api/channels/refresh", {
            method: "POST",
            body: JSON.stringify({
                channel: DEF.channel
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location.reload();

    } catch (e) {
        console.error(e);
        refreshButton.classList.remove("is-loading");
    }
}

const leaveButton = document.getElementById("leaveButton");

leaveButton?.addEventListener("click", async () => {
    leaveButton.classList.add("is-loading");
    await LeaveChannel();
    window.location = "/channels";
})

async function LeaveChannel() {
    try {

        let res = await fetch("/api/channels/modifyMember", {
            method: "POST",
            body: JSON.stringify({
                channel: DEF.channel,
                user: GLOBAL.username,
                mode: "remove"
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong..");
            return;
        }

    } catch (e) {
        console.error(e);
    }
}

const savePresetButton = document.getElementById("savePresetButton");
const presetInput = document.getElementById("preset");

if (savePresetButton && presetInput) {
    savePresetButton.addEventListener("click", () => {
        SavePreset();
    })
}

async function SavePreset() {
    let val = presetInput.value;
    savePresetButton.classList.add("is-loading");

    try {

        let res = await fetch("/api/channels/savePreset", {
            method: "POST",
            body: JSON.stringify({
                channel: DEF.channel,
                preset: val
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            savePresetButton.classList.add("is-danger");
            setTimeout(() => {
                savePresetButton.classList.remove("is-danger");
            }, 1500)
            return;
        }

        savePresetButton.classList.add("is-success");
            setTimeout(() => {
                savePresetButton.classList.remove("is-success");
            }, 1500)

    } catch (e) {
        console.error(e);
    } finally {
        savePresetButton.classList.remove("is-loading");
    }
}

//#region Deleting

const confirmDeleteButton = document.getElementById("confirmDeleteButton");

confirmDeleteButton.addEventListener("click", () => {
    if (confirmDeleteButton.classList.contains("is-loading"))
        return;

    DeleteChannel();
})

async function DeleteChannel() {
    console.log("Deleting channel");

    confirmDeleteButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/channels/delete", {
            method: "POST",
            body: JSON.stringify({ channel: DEF.channel }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location = "/channels";

    } catch (e) {
        console.error(e);
    } finally {
        confirmDeleteButton.classList.remove("is-loading");
    }
}

//#endregion
