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

const createNotesModal = document.getElementById("createNotesModal");
const createNoteContent = document.getElementById("createNoteContent");
const createNoteButton = document.getElementById("createNoteButton");
const createNoteTitle = document.getElementById("createNoteTitle");
const noteTitleHelp = document.getElementById("noteTitleHelp");
const noteContentHelp = document.getElementById("noteContentHelp");

let currentAsset = undefined;
let createNoteCallback = undefined;

export function OpenCreateModal(asset, cb) {
    createNoteContent.value = "";
    createNoteTitle.value = "";
    currentAsset = asset;
    createNotesModal.classList.add("is-active");
    createNoteCallback = cb;
    noteTitleHelp.innerText = `0 / 255`;
    noteContentHelp.innerText = `0 / 2048`;
}

createNotesModal.addEventListener("modalclose", () => {
    currentAsset = undefined;
    createNoteCallback = undefined;
})

createNoteButton.addEventListener("click", async () => {
    if (!createNoteButton.classList.contains("is-loading")) {
        await CreateNote();
        if (createNoteCallback) {
            createNoteCallback();
        }
        createNotesModal.classList.remove("is-active");
        currentAsset = undefined;
        createNoteCallback = undefined;
    }
})

async function CreateNote() {
    if (typeof currentAsset === "undefined") {
        console.error("No asset given");
        return;
    }

    createNoteButton.classList.add("is-loading");
    try {

        const res = await fetch("/api/notes/create", {
            method: "POST",
            body: JSON.stringify({
                asset: currentAsset,
                title: createNoteTitle.value,
                content: createNoteContent.value
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

    } catch (e) {
        console.error(e);
    } finally {
        createNoteButton.classList.remove("is-loading");
    }
}

createNoteTitle.addEventListener("input", () => {
    noteTitleHelp.innerText = `${createNoteTitle.value.length} / 255`;
})

createNoteContent.addEventListener("input", () => {
    noteContentHelp.innerText = `${createNoteContent.value.length} / 2048`;
})

