import { CreateSmartTimeString } from "./helpers.js";
import "./contextMenu.js"
import "./comments.js";

//#region Forms
const messagesSection = document.getElementById("messagesSection");
const messageList = document.getElementById("messageList");

const forms = document.querySelectorAll("[data-form]");
forms.forEach(form => {

    let target = form.getAttribute("data-form");
    if (!target || target.startsWith("http") || !target.startsWith("/")) {
        return;
    }

    let enctype = form.getAttribute("enctype");
    
    let fields = form.querySelectorAll("[name]");
    let submitbutton = form.querySelector("button:not([type='button'])");
    
    submitbutton.addEventListener("click", async (e) => {
        e.preventDefault();
        submitbutton.classList.add("is-loading");

        fields.forEach(field => {
            field.classList.remove("is-danger");
        })

        try {

            let res;

            if (!enctype) {
                let body = {};
                body["_disabledFields"] = [];
                fields.forEach(f => {
                    if (f.hasAttribute("disabled")) {
                        body["_disabledFields"].push(f.getAttribute("name"));
                    }
                    let type = f.getAttribute("type");
                    body[f.getAttribute("name")] = type == "checkbox" ? f.checked : f.value || undefined;
                    f.setAttribute("disabled", true);
                })
    
                res = await fetch(target, {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

            } else if (enctype == "multipart/form-data") {
                let body = new FormData();
                fields.forEach(f => {
                    if (f.hasAttribute("disabled")) {
                        body.append("_disabled", f.getAttribute("name"));
                    }
                    if (f.getAttribute("type") == "file" && f.files) {
                        for (let i = 0; i < f.files.length; i++) {
                            body.append(`${f.getAttribute("name")}`, f.files[i])
                        }
                    } else {
                        let type = f.getAttribute("type");
                        if (type == "checkbox") {
                            body.append(f.getAttribute("name"), f.checked);
                        } else if (f.value) {
                            body.append(f.getAttribute("name"), f.value);
                        }
                    }
                    f.setAttribute("disabled", true);
                })

                res = await fetch(target, {
                    method: "POST",
                    body
                })
            }

            let json = await res.json();

            messageList.innerHTML = "";

            if (!json.success) {
                messagesSection.classList.remove("is-hidden");
                console.error(json.msg || "Something went wrong");
                
                submitbutton.classList.remove("is-loading");

                fields.forEach(field => {
                    field.removeAttribute("disabled");
                })

                if (json.msg) {
                    if (!Array.isArray(json.msg)) {
                        json.msg = [json.msg];
                    }
                    json.msg.forEach(msg => {
                        let l = document.createElement("li");
                        if (typeof msg == "object") {
                            l.innerText = msg.msg;
                            if (msg.field) {
                                if (Array.isArray(msg.field)) {
                                    msg.field.forEach(f => {
                                        let elem = document.querySelector(`input[name="${f}"]`);
                                        if (elem) {
                                            elem.classList.add("is-danger");
                                        }
                                    })
                                } else {
                                    let elem = document.querySelector(`input[name="${msg.field}"]`);
                                    if (elem) {
                                        elem.classList.add("is-danger");
                                    }
                                }
                            }
                        } else {
                            l.innerText = msg;
                        }
                        messageList.appendChild(l);
                    })
                }
            } else {
                messagesSection.classList.add("is-hidden");
                if (json.redirect) {
                    if (json.redirect.startsWith("http")) {
                        window.location = `/out?target=${encodeURIComponent(json.redirect)}`;
                    } else {
                        window.location = json.redirect;
                    }
                } else {
                    submitbutton.classList.remove("is-loading");

                    fields.forEach(field => {
                        field.removeAttribute("disabled");
                    })
                }
            }
            

        } catch (e) {
            console.error(e);
            submitbutton.classList.remove("is-loading");

            fields.forEach(field => {
                field.setAttribute("disabled", false);
            })
        }
    })

})

//#endregion

//#region File uploads

const fileUploads = document.querySelectorAll("input[type='file']");
fileUploads.forEach(fileInput => {
    let label = fileInput.parentElement.querySelector(".file-name");
    if (label) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files) {
                let names = [];
                for (let i = 0; i < e.target.files.length; i++) {
                    names.push(e.target.files[i].name);
                }
                label.innerText = names.join(", ");
                label.setAttribute("title", names.join(", "))
            }
        })
    }
})

//#endregion

//#region Time

const timeElements = document.querySelectorAll("time");
timeElements.forEach(time => {
    let format = time.getAttribute("data-format");
    let datetime = time.getAttribute("datetime");
    let type = time.getAttribute("data-time");
    if (format && datetime) {
        if (type == "duration") {
            time.innerText = moment.utc(moment.duration(datetime).asMilliseconds()).format(format);
        } else {
            let date = moment(datetime);
            if (format == "now") {
                time.innerText = date.fromNow();
                time.title = date.format("Do MMMM YYYY HH:mm");
            } else if (format == "smart") {
                let defDate = new Date(datetime);
                time.innerText = CreateSmartTimeString(defDate);
                time.title = CreateSmartTimeString(defDate, true);
            } else {
                time.innerText = date.format(format);
            }
        } 
    }
})

//#endregion

//#region Navbar

const navBurgers = document.querySelectorAll(".navbar-burger");

navBurgers.forEach(el => {
    el.addEventListener("click", () => {
        const target = el.getAttribute("data-target");
        const targetElem = document.getElementById(target);

        el.classList.toggle("is-active");
        targetElem.classList.toggle("is-active");
    })
})

//#endregion

//#region Search inputs

const searchInputs = document.querySelectorAll(".field[data-search]");
searchInputs.forEach(search => {
    const target = search.getAttribute("data-search");
    const input = search.querySelector("input[type='text']");
    const resultInput = search.querySelector("input[type='hidden']");
    const tagElement = document.createElement("div");
    tagElement.classList.add("tags", "mt-2");
    search.querySelector(".control").appendChild(tagElement);

    let searchTimer;
    input.addEventListener("input", () => {
        input.classList.remove("is-skeleton");
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            let val = input.value;
            let resultTags = tagElement.querySelector(".tags.result");
            if (resultTags) {
                resultTags.remove();
            }
            if (val.trim() == "" || !val) {
                return;
            }
            DoSearch(input, resultInput, tagElement, target);
        }, 200);
    })
})

/**
 * 
 * @param {HTMLInputElement} input 
 * @param {HTMLInputElement} result 
 * @param {HTMLElement} tagElement 
 * @param {string} target 
 */
async function DoSearch(input, result, tagElement, target) {
    try {
        input.classList.add("is-skeleton");

        let body = new URLSearchParams({
            q: input.value,
            limit: 5,
            exclude: result.value ? JSON.parse(result.value).join(",") : null
        });

        let res = await fetch(`/api/users/list?${body.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        let resultTagContainer = document.createElement("div");
        resultTagContainer.classList.add("tags", "result");

        json.items.forEach(user => {
            let tagElem = document.createElement("span");
            tagElem.classList.add("tag", "clickable");
            tagElem.innerText = user.display_name;
            tagElem.title = user.username;
            resultTagContainer.appendChild(tagElem);

            tagElem.addEventListener("click", () => {
                if (!result.value) {
                    result.value = JSON.stringify([user.username]);
                } else {
                    let currentRes = JSON.parse(result.value);
                    if (!currentRes.includes(user.username)) {
                        currentRes.push(user.username);
                        result.value = JSON.stringify(currentRes);
                    }
                }
                tagElem.remove();

                let newTag = document.createElement("div");
                newTag.classList.add("tag", "clickable", "is-link");
                newTag.innerText = user.display_name;
                newTag.title = user.username;

                newTag.addEventListener("click", () => {
                    if (!result.value) {
                        return;
                    }
                    let currentRes = JSON.parse(result.value);
                    let index = currentRes.findIndex(x => x == user.username);
                    if (index != -1) {
                        currentRes.splice(index, 1);
                    }
                    result.value = JSON.stringify(currentRes);
                    newTag.remove();
                })

                resultTagContainer.insertAdjacentElement("beforebegin", newTag);
            })
        })

        tagElement.appendChild(resultTagContainer);

    } catch (e) {
        console.error(e);
    } finally {
        input.classList.remove("is-skeleton");
    }
}

//#endregion
