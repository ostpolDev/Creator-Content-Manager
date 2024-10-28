const coverField = document.getElementById("coverField");
const fileInput = document.getElementById("fileInput");
const fileNameText = document.getElementById("fileName");
const typeInput = document.getElementById("type");
const croppieArea = document.getElementById("croppieArea");
const saveButton = document.getElementById("saveButton");
const submitButton = document.getElementById("submitButton");

let crop, fileName;

typeInput.addEventListener("input", (e) => {
    if (typeInput.value == "album") {
        coverField.classList.remove("is-hidden");
    } else {
        coverField.classList.add("is-hidden");
    }
})

fileInput.addEventListener("change", (e) => {
    if (!e.target.files) {
        return;
    }

    fileName = e.target.files[0].name;
    fileNameText.innerText = fileName;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (crop) {
            crop.destroy();
        }
        crop = new Croppie(croppieArea, {
            url: reader.result,
            viewport: { width: 300, height: 300 },
            boundary: { width: 320, height: 320 },
            showZoomer: true,
            enableOrientation: true,
        });
    }, false);
    reader.readAsDataURL(e.target.files[0]);
})

submitButton.addEventListener("click", () => {
    submitButton.classList.add("is-loading");

    UploadChanges();
})

async function UploadChanges() {
    try {
        if (crop) {
            // Upload crop image

            let cropResult = await crop.result({
                type: "blob",
                format: "webp"
            });

            let body = new FormData();
            body.append("batch", DEF.batch);
            body.append("cover", cropResult);
            body.append("name", fileName);
            let res = await fetch("/api/batches/cover", {
                method: "POST",
                body
            });
            let json = await res.json();

            if (!json.success) {
                console.error(json.msg || "Something went wrong...");
                return;
            }
        }
        saveButton.click();
    } catch (e) {
        console.error(e);
    } finally {
        submitButton.classList.remove("is-loading");
    }
}

const removeCoverImage = document.getElementById("removeCoverImage");

removeCoverImage.addEventListener("click", () => {
    RemoveCoverImage();
})

async function RemoveCoverImage() {
    removeCoverImage.classList.add("is-loading");

    try {

        let res = await fetch("/api/batches/cover/remove", {
            method: "POST",
            body: JSON.stringify({
                batch: DEF.batch
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location.reload();

    } catch (e) {
        console.error(e);
        removeCoverImage.classList.remove("is-loading");
    }
}
