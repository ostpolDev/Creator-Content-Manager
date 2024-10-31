const fileInput = document.querySelector("input[type='file']");
const assetType = document.getElementById("assetType");
const nameInput = document.getElementById("name");

let audio = document.createElement("audio");

fileInput?.addEventListener("change", (e) => {
    if (!e.target.files) {
        return;
    }

    if (e.target.files.length > 1) {
        nameInput.setAttribute("disabled", true);
    } else {
        nameInput.removeAttribute("disabled");
        nameInput.value = TryParseName(e.target.files[0].name);
    }
    

    let audioFile = null;
    for (let i = 0; i < e.target.files.length; i++) {
        if (e.target.files[i].type.startsWith("audio")) {
            audioFile = e.target.files[i];
        }
    }

    if (!audioFile) {
        let type = e.target.files[0].type;
        if (type.startsWith("image")) {
            assetType.value = "image";
        } else if (type.startsWith("video")) {
            assetType.value = "video";
        } else {
            assetType.value = "text";
        }

        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
        audio.oncanplay = () => {
            if (audio.duration > 60) {
                assetType.value = "music";
            } else {
                assetType.value = "soundEffect";
            }
        }
        audio.onerror = () => {
            assetType.value = "music";
        }
        audio.src = reader.result;
    }, false);
    reader.readAsDataURL(audioFile);
    
})

/**
 * 
 * @param {string} name 
 * @returns 
 */
function TryParseName(name) {
    name = name.split(".").reverse().splice(1).reverse().join(0);
    name = name.replace(/_/gi, " ");
    name = name.trim();
    name = name.charAt(0).toUpperCase() + name.substring(1);
    return name;
}
