const collectionAssetName = document.getElementById("collectionAssetName");
const collectionSelect = document.getElementById("collectionSelect");
const newCollection = document.getElementById("newCollection");

async function AddAssetToCollection(id) {

    try {

        let res = await fetch("/api/assets/get/info/"+encodeURIComponent(id));
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        let asset = json.asset;
        collectionAssetName.innerText = asset.name;

        toggleModalQuery("#collectionModal");
    } catch (e) {
        console.error(e);
    }

}

collectionSelect.addEventListener("change", (e) => {
    if (e.target.value == "undefined") {
        newCollection.classList.remove("hidden");
    } else {
        newCollection.classList.add("hidden");
    }
})
