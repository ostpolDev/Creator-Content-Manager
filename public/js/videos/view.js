//#region Refresh

const refreshButton = document.getElementById("refreshButton");

refreshButton?.addEventListener("click", async () => {
    if (refreshButton.getAttribute("disabled") == "true") {
        return;
    }

    refreshButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/videos/refresh", {
            method: "POST",
            body: JSON.stringify({
                id: DEF.video
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location.reload();

    } catch (e) {
        console.error(e);
    } finally {
        refreshButton.classList.remove("is-loading");
    }
})

//#endregion

//#region Deleting

const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const deleteButton = document.getElementById("deleteButton");

deleteButton.addEventListener("click", () => {
    SetModalOpen("#deleteModal", true)
})

confirmDeleteButton.addEventListener("click", async () => {
    confirmDeleteButton.classList.add("is-loading");
    try {

        const res = await fetch("/api/videos/delete", {
            method: "POST",
            body: JSON.stringify({
                video: DEF.video
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location = "/videos";

    } catch (e) {
        console.error(e);
    } finally {
        confirmDeleteButton.classList.remove("is-loading");
    }
})


//#endregion
