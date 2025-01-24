//#region Refresh

const refreshButton = document.getElementById("refreshButton");

refreshButton.addEventListener("click", async () => {
    if (refreshButton.getAttribute("disabled") == "true") {
        return;
    }

    refreshButton.classList.add("is-loading");

    try {

        const res = await fetch("/api/videos/refresh", {
            method: "POST",
            body: JSON.stringify({
                id: DEF.video
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location.reload();

    } catch (e) {
        console.error(e);
    } finally {
        refreshButton.classList.remove("is-loading");
    }
})

//#endregion
