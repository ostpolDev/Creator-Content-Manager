const userElement = document.getElementById("userElement");
const userElementImage = document.getElementById("userElementImage");
const userElementName = document.getElementById("userElementName");

let sortSelect = document.getElementById("sortSelect");
let orderSelect = document.getElementById("orderSelect");
let searchButton = document.getElementById("searchButton");
let assetTableBody = document.getElementById("assetTableBody");
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

let previousParams;
let totalSkip = 0;
let reachedEnd = false;

let baseUrl = "/api/assets/get/rendered";

start();

function start() {
    switch (type) {
        case "userFav":
            baseUrl += "?favUser="+encodeURIComponent(user)
            userType();
            break;
        default:
            console.error("Invalid Type");
            break;
    }
}

function userType() {
    console.log("User fav type");
    fetch("/api/users/getDisplayInfo/"+encodeURIComponent(user)).then((res) => {
        return res.json();
    }).then((json) => {
        if (json.success == true) {
            userElementName.innerText = json.info.username;
            userElementImage.src = json.info.avatarUrl;
            userElementImage.alt = json.info.username;
            userElement.href = json.info.pageUrl;
            userElement.classList.remove("hidden");

            search(true);
        }
    }).catch((err) => {
        console.error(err);
    })
}

function search(forceNew) {
    console.log("Searching for assets...");
    searchButton.disabled = true;

    if (forceNew == true) {
        previousParams = "";
    }

    let order = orderSelect.value || "-1";
    let sort = sortSelect.value || "name";
    let searchText = searchQuery.value || "";

    let url = baseUrl;
    let params = `&limit=12&sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`;

    if (searchText && searchText.trim() != "") {
        params += "&query="+encodeURIComponent(searchText);
    }
    
    if (params != previousParams) { // This is a new search. Not a "load more" request
        loadMoreButton.classList.remove("hidden");
        loadMoreButton.disabled = false;
        reachedEnd = false;
        assetTableBody.innerHTML = "";
        totalSkip = 0;
    } else if (reachedEnd === true) {
        console.log("Can't load more. The end has been reached");
        return;
    }
    
    previousParams = params;
    
    params += `&skip=${encodeURIComponent(totalSkip)}`;
    
    fetch(url + params).then((res) => {return res.json()}).then(json => {
        if (json.success === true) {
            console.log("Asset request successful!");
            if (json.items > 0) {
                assetTableBody.innerHTML = assetTableBody.innerHTML + json.renderedResult;
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
    sortSelect.value = "name";
    orderSelect.value = "-1";
    searchQuery.value = "";
    search();
    searchButton.disabled = false;
}
