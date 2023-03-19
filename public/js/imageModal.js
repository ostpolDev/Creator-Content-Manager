let image = document.getElementById("imageModalImage");
let imageLink = document.getElementById("imageLink");

function openImage(src) {
    image.src = src;
    imageLink.href = src;
    toggleModalQuery("#imageModal")
}