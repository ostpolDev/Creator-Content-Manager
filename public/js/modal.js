let modalButtons = document.querySelectorAll("[data-modal]")

modalButtons.forEach(e => {
    let data = e.getAttribute("data-modal");
    if (data) {
        if (data === "close") {
            e.setAttribute("aria-label", "Close");
        }
        e.addEventListener("click", (event) => {
            if (data === "close") {
                openModal(event.target.closest(".modal"), false);
            } else {
                let modal = document.querySelector(data);
                openModal(modal, !modal.classList.contains("active"));
            }
        })
    }
})

function openModal(/**@type {HTMLElement} */ modal, open) {
    modal.style.opacity = open ? 1 : 0;
    if (open) {
        modal.classList.add("active");
    } else {
        modal.classList.remove("active");
    }
}