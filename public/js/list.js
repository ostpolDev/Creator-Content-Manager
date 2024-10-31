import { MakeAssetElement } from "./assets/assetFunctions.js";
import { CreateVideoElement } from "./videoFunctions.js";

class List {

    /**
     * 
     * @param {HTMLElement} element 
     * @param {string} type 
     */
    constructor(element, type) {
        this.element = element;
        this.type = type;
        this.id = this.#randomID();

        this.skip = 0;

        this.limit = Number.parseInt(element.getAttribute("data-list-limit") || 0);
        this.filter = element.getAttribute("data-list-filter") || "*";
        this.disableLoadMore = element.getAttribute("data-list-load") == "false";
        this.size = element.getAttribute("data-list-size") || null;

        this.urlParams = new URLSearchParams(window.location.search);
        this.externalFilters = {};
        this.filterElems = [];

        this.element.innerHTML = "";
        this.searchTimeout = undefined;

        this.#registerListeners();

        /**
         * @type {HTMLElement}
         */
        this.loadMoreButton = null;

        this.#makeLoadMoreButton();
    }

    #randomID() {
        return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    #makeLoadMoreButton() {
        this.loadMoreButton = document.createElement("button");
        this.loadMoreButton.innerText = "Load More";
        this.loadMoreButton.classList.add("button", "is-fullwidth");
        if (!this.disableLoadMore) {
            let targetAdjElem = this.element.parentElement.nodeName == "TABLE" ? this.element.parentElement : this.element;
            targetAdjElem.insertAdjacentElement("afterend", this.loadMoreButton);
            this.loadMoreButton.addEventListener("click", () => {
                this.LoadMore();
            })
        }
    }

    LoadMore() {
        return new Promise(async (res, rej) => {
            try {

                this.loadMoreButton.classList.remove("is-hidden");
                this.loadMoreButton.classList.add("is-loading");

                let body = {
                    skip: this.skip,
                    limit: this.limit || 50
                }

                if (this.filter != "*") {
                    let filterParts = this.filter.split(";")
                    filterParts.forEach(filter => {
                        let parts = filter.split(":");
                        if (parts.length == 2) {
                            body[parts[0]] = parts[1]
                        }
                    })
                }

                if (Object.keys(this.externalFilters).length > 0) {
                    body = {
                        ...body,
                        ...this.externalFilters
                    }
                } else {
                    if (this.urlParams.has("channel")) {
                        body["channel"] = this.urlParams.get("channel");
                    } else {
                        this.#forceUpdateFilters();
                        if (Object.keys(this.externalFilters).length > 0) {
                            body = {
                                ...body,
                                ...this.externalFilters
                            }
                        }
                    }
                }
                

                let response = await fetch(`${this.#getTarget()}?${new URLSearchParams({...body}).toString()}`)
                let json = await response.json();

                if (!json.success) {
                    console.error(json.msg || "Something went wrong...");
                    return rej();
                }

                if (json.reachedEnd == true) {
                    this.loadMoreButton.classList.add("is-hidden");
                }

                this.skip += json.items.length;

                json.items.forEach(item => {
                    this.element.appendChild(this.#insertRowElement(item));
                })

                return res();


            } catch (e) {
                return rej(e);
            } finally {
                this.loadMoreButton.classList.remove("is-loading");
            }
        })
    }

    #insertRowElement(item) {
        switch (this.type) {
            case "videos":
                return CreateVideoElement(item, this.size);
            case "assets":
                return MakeAssetElement(item);
            case "users":
                return MakeUserElement(item);
            default:
                break;
        }
    }

    #getTarget() {
        switch (this.type) {
            case "videos":
                return "/api/videos/list";
            case "assets":
                return "/api/assets/list";
            case "users":
                return "/api/users/list";
            default:
                return undefined;
        }
    }

    #registerListeners() {
        const elems = document.querySelectorAll(`[data-list-target='${this.type}']`);
        elems.forEach(elem => {
            let filterType = elem.getAttribute("data-list-filter");
            if (filterType) {
                this.filterElems.push(elem);
                elem.addEventListener("input", () => {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.externalFilters[filterType] = elem.value;
                        this.skip = 0;
                        this.element.innerHTML = "";
                        this.LoadMore();
                    }, 200)
                })
            }

        })
    }

    #forceUpdateFilters() {
        this.filterElems.forEach(elem => {
            let type = elem.getAttribute("data-list-filter");
            this.externalFilters[type] = elem.value;
        })
    }

}

export default List;
