let hoverElements = document.querySelectorAll("[data-hover],img[alt]");
let hoverTag = document.getElementById("hoverTag");
let hoverTagText = document.getElementById("hoverTagText");

hoverElements.forEach(/** @type {HTMLElement} */ e => {
    let text = e.getAttribute("data-hover");
    if (!text) {
        text = e.getAttribute("alt") || e.alt;
    }
    if (text.trim() != "") {
        e.addEventListener("mouseenter", (event) => {
            popup(event, e, text);
        })
        e.addEventListener("mouseleave", (event) => {
            closepopup();
        })
    }
})

function closepopup() {
    hoverTag.style.opacity = 0;
    hoverTag.style.transform = "translateY(5px)";
    hoverTag.classList.remove("active");
}

function popup(/**@type {MouseEvent} */ event, /** @type {HTMLElement} */ element, text) {
    let x = element.getBoundingClientRect().x;
    let y = element.getBoundingClientRect().top - 35;

    hoverTag.style.top = pixel(y);
    hoverTag.style.left = pixel(x);
    hoverTag.style.opacity = 1;
    hoverTag.style.transform = "translateY(0px)";

    hoverTagText.innerText = text;
    hoverTag.classList.add("active");
}

function pixel(x) {
    return x + "px";
}