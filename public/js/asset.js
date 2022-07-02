const removeFavButton = document.getElementById("removeFavButton");
const addFavButton = document.getElementById("addFavButton");
const deleteAssetButton = document.getElementById("deleteAssetButton");

function manageFav(type, id) {
    if (isDisabled()) {
        return;
    }

    removeFavButton.disabled = addFavButton.disabled = true;
    fetch("/api/users/modifyFavorite", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({type, asset: id})
    }).then((res) => {
        return res.json();
    }).then((json) => {
        if (json.success == true) {
            manageButtons(json.isInFavorites);
            setTimeout(() => {
                removeFavButton.disabled = addFavButton.disabled = false;
            }, 1000);
        }
    }).catch((err) => {
        console.error(err);
    })
}

function isDisabled() {
    return removeFavButton.disabled === true || addFavButton.disabled === true;
}

function manageButtons(isInFavorites) {
    if (isInFavorites) {
        removeFavButton.classList.remove("hidden");
        addFavButton.classList.add("hidden");
    } else {
        removeFavButton.classList.add("hidden");
        addFavButton.classList.remove("hidden");
    }
}

deleteAssetButton.addEventListener("click", (e) => {
    fetch("/api/assets/delete/"+encodeURIComponent(assetId), {
        method: "POST"
    }).then((res) => {return res.json()}).then((json) => {
        if (json.success === true) {
            window.location = "/assets"
        } else {
            console.error(json.msg);
        }
    }).catch((err) => {
        console.error(err);
    })
})