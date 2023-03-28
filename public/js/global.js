const closedSegments = document.querySelectorAll(".segment.closed");

closedSegments.forEach(seg => {
    seg.classList.add("pointer");
    seg.addEventListener("click", () => {
        seg.classList.toggle("closed");
    })
})
