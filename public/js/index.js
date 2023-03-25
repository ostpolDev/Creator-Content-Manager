const searchQuery = document.getElementById("searchQuery");

searchQuery.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        if (searchQuery.value) {
            window.location = "/assets/search?q="+encodeURIComponent(searchQuery.value);
        }
    }
})