let sortSelect = document.getElementById("sortSelect");
let orderSelect = document.getElementById("orderSelect");
let searchButton = document.getElementById("searchButton");
let channelSelect = document.getElementById("channelSelect");
let videoGridContainer = document.getElementById("videoGridContainer");
let loadMoreButton = document.getElementById("loadMoreButton");
let clearButton = document.getElementById("clearButton");
let searchQuery = document.getElementById("searchQuery");

searchButton.addEventListener("click", () => {search(true);});
loadMoreButton.addEventListener("click", search);
clearButton.addEventListener("click", clear);

searchQuery.addEventListener("keyup", (e) => {
    if (e.key == "Enter") {
        search(true);
    }
})

channelSelect.addEventListener("change", () => {
    search(true);
})

function getChannels() {
    searchButton.disabled = channelSelect.disabled = true;
    channelSelect.innerHTML = "";

    console.log("Searching for channels...");

    fetch("/api/channels/getWithAccess").then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            console.log("Channels found!");
            json.channels.forEach(c => {
                channelSelect.innerHTML += `<option value="${c._id}" ${c._id == currentChannel ? "selected" : ""}>${c.name}</option>`
            })
            searchButton.disabled = channelSelect.disabled = false;
            
            search();
        } else {
            console.error(json.msg);
        }
    }).catch((err) => {
        console.error(err);
    })
}

getChannels();

let previousParams;
let totalSkip = 0;
let reachedEnd = false;

function search(forceNew) {
    console.log("Searching for videos...");
    searchButton.disabled = true;

    if (forceNew == true) {
        previousParams = "";
    }

    let order = orderSelect.value;
    let sort = sortSelect.value;
    let channel = channelSelect.value;
    let searchText = searchQuery.value;

    let url = `/api/videos/get/rendered?`;
    let params = `channel=${encodeURIComponent(channel)}&limit=12&sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`;

    if (searchText && searchText.trim() != "") {
        params += "&query="+encodeURIComponent(searchText);
    }

    if (params != previousParams) { // This is a new search. Not a "load more" request
        loadMoreButton.classList.remove("hidden");
        loadMoreButton.disabled = false;
        reachedEnd = false;
        videoGridContainer.innerHTML = "";
        totalSkip = 0;
    } else if (reachedEnd === true) {
        console.log("Can't load more. The end has been reached");
        return;
    }
    
    previousParams = params;

    params += `&skip=${encodeURIComponent(totalSkip)}`;

    fetch(url + params).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            console.log("Video request successful!");
            if (json.items > 0) {
                videoGridContainer.innerHTML = videoGridContainer.innerHTML + json.renderedResult;
            }

            reachedEnd = json.reachedEnd;

            if (json.reachedEnd) {
                loadMoreButton.disabled = true;
                loadMoreButton.classList.add("hidden");
            } else {
                totalSkip += json.items;
                loadMoreButton.classList.remove("hidden");
            }
        } else {
            console.error(json.msg);
        }
        searchButton.disabled = false;
    }).catch((err) => {
        console.error(err);
    })
}

function clear() {
    sortSelect.value = "upload date";
    orderSelect.value = "-1";
    searchQuery.value = "";
    channelSelect.value = currentChannel;
    search();
    searchButton.disabled = false;
}