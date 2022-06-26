let fileInputs = document.querySelectorAll(".field.file");

fileInputs.forEach(/**@type {Element} */ f => {
    let fileInput = f.querySelector("input[type='file']");
    let nameElement = f.querySelector(".fileUploadName");
    f.addEventListener("click", (e) => {
        fileInput.focus();
        fileInput.click();
    })
    if (nameElement) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files) {
                let names = [];
                for (let i = 0; i < e.target.files.length; i++) {
                    names.push(e.target.files[i].name);
                }
                nameElement.value = names.join(", ");
            } else {
                nameElement.value = "";
            }
        })
    }
})