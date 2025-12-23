import { CreateSmartTimeString } from "../helpers.js";
import { OpenCreateModal, ViewNote } from "./noteModal.js";

const notesBody = document.getElementById("notesBody");
const loadMoreNotesButton = document.getElementById("loadMoreNotesButton");
const newNoteButton = document.getElementById("newNoteButton");

let skip = 0;

async function ResetAndLoad() {
    skip = 0;
    notesBody.innerHTML = "";
    LoadMore();
}

async function LoadMore() {
    loadMoreNotesButton.classList.remove("is-hidden");
    loadMoreNotesButton.classList.add("is-loading");

    try {

        const params = new URLSearchParams({
            asset: DEF.asset,
            skip
        })

        const res = await fetch(`/api/notes/list?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        if (json.reachedEnd) {
            loadMoreNotesButton.classList.add("is-hidden");
        }

        skip += json.notes.length;

        json.notes.forEach(note => {
            const row = document.createElement("tr");
            row.setAttribute("data-note-id", note.id)

            const title = document.createElement("td");
            row.appendChild(title);

            const titleLink = document.createElement("a");
            titleLink.href = "javascript:void(0);";
            titleLink.innerText = note.title;
            title.appendChild(titleLink);

            const preview = document.createElement("td");
            preview.innerText = note.preview || "--";
            row.appendChild(preview);

            const createdAt = document.createElement("td");
            let defDate = new Date(note.created_at);
            createdAt.innerText = CreateSmartTimeString(defDate);
            createdAt.title = CreateSmartTimeString(defDate, true);
            row.appendChild(createdAt);

            titleLink.addEventListener("click", () => {
                ViewNote(note.id);
            })

            notesBody.appendChild(row);
        })

    } catch (e) {
        console.error(e);
    } finally {
        loadMoreNotesButton.classList.remove("is-loading");
    }
}

loadMoreNotesButton.addEventListener("click", () => {
    LoadMore();
})

ResetAndLoad();

newNoteButton.addEventListener("click", () => {
    OpenCreateModal(DEF.asset, () => {
        ResetAndLoad();
    })
})
