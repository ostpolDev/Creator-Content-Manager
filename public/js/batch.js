const deleteBatchButton = document.getElementById("deleteBatchButton");
deleteBatchButton.addEventListener("click", () => {
    fetch("/api/batches/delete/"+encodeURIComponent(currentBatch), {
        method: "POST"
    }).then((res) => {return res.json()}).then((json) => {
        if (json.success === true) {
            window.location = "/assets/batches"
        } else {
            console.error(json.msg);
        }
    }).catch((err) => {
        console.error(err);
    })
})