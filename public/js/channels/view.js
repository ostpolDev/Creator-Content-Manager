const refreshButton = document.getElementById("refreshButton");

refreshButton.addEventListener("click", () => {
    if (refreshButton.hasAttribute("disabled")) {
        return;
    }

    UpdateChannel();
})

async function UpdateChannel() {
    refreshButton.classList.add("is-loading");
    try {

        let res = await fetch("/api/channels/refresh", {
            method: "POST",
            body: JSON.stringify({
                channel: DEF.channel
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        window.location.reload();

    } catch (e) {
        console.error(e);
        refreshButton.classList.remove("is-loading");
    }
}
