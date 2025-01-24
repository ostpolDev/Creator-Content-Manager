const deleteButton = document.getElementById("deleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

deleteButton.addEventListener("click", () => {
    SetModalOpen("#deleteModal", true)
})

confirmDeleteButton.addEventListener("click", async () => {
    confirmDeleteButton.classList.add("is-loading");
    try {

        const res = await fetch("/api/games/delete", {
            method: "POST",
            body: JSON.stringify({
                game: DEF.game
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            confirmDeleteButton.classList.remove("is-loading");
            return;
        }

        window.location = "/games";

    } catch (e) {
        console.error(e);
        confirmDeleteButton.classList.remove("is-loading");
    }
})

const refreshButton = document.getElementById("refreshButton");

refreshButton.addEventListener("click", async () => {
    refreshButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/games/updateSteam", {
            method: "POST",
            body: JSON.stringify({
                id: DEF.game
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
