let sortSelect = document.getElementById("sortSelect");
let orderSelect = document.getElementById("orderSelect");
let searchButton = document.getElementById("searchButton");

searchButton.addEventListener("click", search);

function search() {
    let sort = sortSelect.value;
    let order = orderSelect.value;

    let newUrl = `?sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`;
    window.location = newUrl;
}