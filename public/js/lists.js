import List from "./list.js";

const lists = document.querySelectorAll("[data-list]");

const LIST_TYPES = ["videos", "assets", "users"];

let proms = [];

let ListLookup = {};

async function LoadLists() {
    console.log("Loading lists");
    
    lists.forEach(list => {
        let type = list.getAttribute("data-list");
        if (!LIST_TYPES.includes(type)) {
            return;
        }
        let listObj = new List(list, type);
        ListLookup[list.id] = listObj;
        proms.push(listObj.LoadMore());
    })

    console.log("Found all lists. Processing...");
    let start = Date.now();
    await Promise.all(proms);
    console.log(`Filled all lists in ${Date.now() - start}ms`);
}
LoadLists();
