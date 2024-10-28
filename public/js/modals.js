const modalButtons = document.querySelectorAll("[data-modal]");
const CloseEvent = new Event("modalclose");

modalButtons.forEach(modalButton => {
    let type = modalButton.getAttribute("data-modal");
    modalButton.addEventListener("click", () => {
        if (type == "close") {
            let m = modalButton.closest(".modal");
            m.classList.remove("is-active");
            m.dispatchEvent(CloseEvent)
            return;
        }

        SetModalOpen(type);
    }) 
})

function SetModalOpen(query, isOpen) {
    let element = document.querySelector(`.modal${query}`);

    if (!element) {
        console.error(`Modal not found: ${query}`);
        return;
    }

    if (typeof isOpen == "undefined") {
        element.classList.toggle("is-active");
        if (!element.classList.contains("is-active")) {
            element.dispatchEvent(CloseEvent);
        }
    } else {
        if (isOpen) { element.classList.add("is-active") }
        else { element.classList.remove("is-active"); element.dispatchEvent(CloseEvent) }
    }

    return element;
}
