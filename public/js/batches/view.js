import "../assets/playlist.js"

const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const deleteButton = document.getElementById("deleteButton");
const deleteModal = document.getElementById("deleteModal");

let toDelete = undefined;

deleteModal.addEventListener("modalclose", () => {
    toDelete = undefined;
})

deleteButton.addEventListener("click", () => {
    toDelete = DEF.batch;
    SetModalOpen("#deleteModal", true);
})

confirmDeleteButton.addEventListener("click", () => {
    if (!toDelete) {
        return;
    }
    DeleteBatch();
})

async function DeleteBatch() {
    if (!toDelete) {
        return;
    }
    confirmDeleteButton.classList.add("is-loading");

    try {
        let res = await fetch("/api/batches/delete", {
            method: "POST",
            body: JSON.stringify({
                batch: DEF.batch
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
        let json = await res.json();
        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }
        window.location = "/assets/batches";
    } catch (e) {
        console.error(e);
        confirmDeleteButton.classList.remove("is-loading");
    }
}
