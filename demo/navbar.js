let navToggles = document.querySelectorAll(".navToggle");

navToggles.forEach(e => {
    e.addEventListener("click", () => {
        e.closest(".navbar").classList.toggle("active");
    })
})