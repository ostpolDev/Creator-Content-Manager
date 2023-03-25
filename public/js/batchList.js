let sortSelect = document.getElementById("sortSelect");
let orderSelect = document.getElementById("orderSelect");
let searchButton = document.getElementById("searchButton");
let batchTableBody = document.getElementById("batchTableBody");
let loadMoreButton = document.getElementById("loadMoreButton");
let clearButton = document.getElementById("clearButton");
let searchQuery = document.getElementById("searchQuery");
let batchContainer = document.getElementById("batchContainer");
let albumContainer = document.getElementById("albumContainer");
let batchColumnBody = document.getElementById("batchColumnBody");

if (TYPE == "albums") {
    albumContainer.classList.remove("hidden");
    batchContainer.classList.add("hidden");
} else {
    albumContainer.classList.add("hidden");
    batchContainer.classList.remove("hidden");
}

searchButton.addEventListener("click", () => {search(true);});
loadMoreButton.addEventListener("click", search);
clearButton.addEventListener("click", clear);

searchQuery.addEventListener("keyup", (e) => {
    if (e.key == "Enter") {
        search(true);
    }
})

let previousParams;
let totalSkip = 0;
let reachedEnd = false;

function search(forceNew) {
    console.log("Searching for batches...");
    searchButton.disabled = true;

    if (forceNew == true) {
        previousParams = "";
    }

    let order = orderSelect.value;
    let sort = sortSelect.value;
    let searchText = searchQuery.value;

    let url;
    let params = `limit=32&sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`;

    if (TYPE == "albums") {
        url = `/api/batches/get?`;
        params += "&album=true";
    } else {
        url = `/api/batches/get/rendered?`;
    }

    if (searchText && searchText.trim() != "") {
        params += "&query="+encodeURIComponent(searchText);
    }

    
    if (params != previousParams) { // This is a new search. Not a "load more" request
        loadMoreButton.classList.remove("hidden");
        loadMoreButton.disabled = false;
        reachedEnd = false;
        batchTableBody.innerHTML = "";
        batchColumnBody.innerHTML = "";
        totalSkip = 0;
    } else if (reachedEnd === true) {
        console.log("Can't load more. The end has been reached");
        return;
    }
    
    previousParams = params;
    
    params += `&skip=${encodeURIComponent(totalSkip)}`;
    
    fetch(url + params).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            console.log("Batch request successful!");
            if (json.items > 0) {
                if (TYPE == "batches") {
                    batchTableBody.innerHTML = batchTableBody.innerHTML + json.renderedResult;
                } else {
                    json.batches.forEach(batch => {
                        batchColumnBody.innerHTML += `
                            <div class="column oneQuarter">
                                <a class="card hoverable" href="/assets/batches/v/${batch._id}">
                                    <div class="cardImage">
                                        <img src="/assets/batches/cover/${batch._id}" loading="lazy">
                                    </div>
                                    <div class="cardBody">
                                        <h1 class="header">${batch.name}</h1>
                                    </div>
                                </a>
                            </div>
                        `;
                    })
                }
            }

            reachedEnd = json.reachedEnd;

            if (json.reachedEnd) {
                loadMoreButton.disabled = true;
                loadMoreButton.classList.add("hidden");
                console.log("The end has been reached")
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
    sortSelect.value = "album";
    orderSelect.value = "-1";
    searchQuery.value = "";
    search();
    searchButton.disabled = false;
}

function showBatch(id) {
    window.location = "/assets/batches/v/"+encodeURIComponent(id);
}

search(true);