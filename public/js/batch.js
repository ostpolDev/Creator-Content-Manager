const descriptionSegment = document.getElementById("descriptionSegment");

const url = `/api/assets/getFirstInBatch/${currentBatch}`;

function loadFirstAsset() {
    if (descriptionSegment.innerText) {
        return;
    }
    fetch(url).then(res => {return res.json();}).then(json => {
        if (json.success === true) {
            let asset = json.asset;
            if (asset.description.rendered) {
                descriptionSegment.innerHTML = asset.description.rendered;
            }
        } else {
            console.error(json.msg);
        }
    }).catch(err => {
        console.error(err);
    })
}

loadFirstAsset();