const assetNotesModal = document.getElementById("assetNotesModal");
const assetNotesTitle = document.getElementById("assetNotesTitle");
const assetNotesContent = document.getElementById("assetNotesContent");
const deleteAssetNoteButton = document.getElementById("deleteAssetNoteButton");

let currentNote = undefined;

export async function ViewNote(id) {
    try {

        const res = await fetch(`/api/notes/get/${encodeURIComponent(id)}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        assetNotesTitle.innerText = json.note.title;
        assetNotesContent.innerText = json.note.content;
        deleteAssetNoteButton.classList.remove("is-loading");

        currentNote = json.note.id;
        
        assetNotesModal.classList.add("is-active");
    } catch (e) {
        console.error(e);
    }
}

assetNotesModal.addEventListener("modalclose", () => {
    currentNote = undefined;
})

deleteAssetNoteButton.addEventListener("click", () => {
    if (typeof currentNote === "undefined") {
        return;
    }
    DeleteCurrentNote();
})

async function DeleteCurrentNote() {
    deleteAssetNoteButton.classList.add("is-loading");
    try {

        const res = await fetch("/api/notes/delete", {
            method: "POST",
            body: JSON.stringify({
                note: currentNote
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

        document.querySelectorAll(`[data-note-id='${json.deleted}']`).forEach(e => e.remove());

        assetNotesModal.classList.remove("is-active");

    } catch (e) {
        console.error(e);
    } finally {
        deleteAssetNoteButton.classList.remove("is-loading");
    }
}
