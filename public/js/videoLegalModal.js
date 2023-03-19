const viewLegalInfoButtons = document.getElementById("viewLegalInfoButtons");

viewLegalInfoButtons.addEventListener("click", () => {
    viewLegalInformation();
})

async function viewLegalInformation() {
    viewLegalInfoButtons.classList.add("loading");
}