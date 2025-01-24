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
