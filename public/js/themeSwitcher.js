let themes = ["Dark", "Auto", "Light"];

function setTheme(theme) {
    if (!theme || !themes.includes(theme)) {
        console.log("Invalid Theme");
        return;
    }

    fetch("/setTheme", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({theme: theme})
    }).then(res => {
        if (res.status === 200) {
            window.location.reload();
        }
    }).catch(e => {
        console.error(e);
    })
}