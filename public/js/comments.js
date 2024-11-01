import { CreateSmartTimeString } from "./helpers.js";

const commentSection = document.querySelector("[data-comment]");

/**
 * @type {string}
 */
let target;

let skips = {
    "_": 0
}

/**
 * @type {Object.<string, HTMLButtonElement>}
 */
let loadMoreButtons = {
    "_": null
}

let targetElemLookup = {
    "_": null
}

if (commentSection) {
    let identifier = commentSection.getAttribute("data-comment");
    target = identifier;
    console.log(`Comments: ${target}`);
    if (target) {
        MakeCommentSection(commentSection);
        MakeLoadMoreButton(commentSection);
        LoadMore(commentSection);
    }
}

function MakeLoadMoreButton(targetElement, parent) {
    let loadMoreButton = document.createElement("button");
    loadMoreButton.classList.add("is-link", "is-fullwidth", "button");
    loadMoreButton.innerText = "Load More";
    targetElement.insertAdjacentElement("afterend", loadMoreButton);
    loadMoreButton.addEventListener("click", () => {
        LoadMore(targetElement, parent);
    })
    loadMoreButtons[parent ? parent : "_"] = loadMoreButton;
    
}

/**
 * 
 * @param {HTMLElement} target 
 * @param {string} parent 
 */
function MakeCommentSection(target, parent) {
    let block = document.createElement("div");
    block.classList.add("block", "mb-4");
    block.setAttribute("data-comment-type", "section");

    let field = document.createElement("div");
    field.classList.add("field", "block", "mb-4");
    block.appendChild(field);

    let label = document.createElement("label");
    label.classList.add("label");
    label.setAttribute("for", "commentInput");
    field.appendChild(label);

    let control = document.createElement("div");
    control.classList.add("control");
    field.appendChild(control);

    let textarea = document.createElement("textarea");
    textarea.classList.add("textarea");
    textarea.id = "commentInput";
    textarea.placeholder = "Write a comment...";
    control.appendChild(textarea);

    let submitButton = document.createElement("button");
    submitButton.classList.add("button", "is-fullwidth");
    submitButton.innerText = "Submit";
    block.appendChild(submitButton);

    submitButton.addEventListener("click", async () => {
        let val = textarea.value;
        if (!val || val.trim() == "") {
            return;
        }

        let res = await CreateComment(submitButton, parent, val);
        if (res) {
            textarea.value = "";
            skips[parent || "_"] = 0;
            if (loadMoreButtons[parent || "_"]) {
                loadMoreButtons[parent || "_"].click();
            }
            targetElemLookup[parent || "_"].innerHTML = "";
        }
    })

    targetElemLookup[parent || "_"] = target;

    target.insertAdjacentElement("beforebegin", block)
}

function GetLoadMoreButton(parent) {
    return loadMoreButtons[parent ? parent : "_"];
}

async function LoadMore(targetElement, parent) {
    let loadMoreButton = GetLoadMoreButton(parent);
    loadMoreButton.classList.add("is-loading");
    loadMoreButton.classList.remove("is-hidden");

    let layer = parseInt(targetElement.getAttribute("data-layer") || 0);

    try {

        let skipTarget = parent ? parent : "_";

        let body = {
            skip: skips[skipTarget],
            identifier: target
        }
        if (parent) {
            body["parent"] = parent;
        }

        let params = new URLSearchParams(body);
        let res = await fetch(`/api/comments/list?${params.toString()}`);
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        if (!skips[skipTarget]) {
            skips[skipTarget] = json.items.length;
        } else {
            skips[skipTarget] += json.items.length;
        }

        if (json.reachedEnd) {
            loadMoreButton.classList.add("is-hidden");
        }

        json.items.forEach(comment => {
            targetElement.appendChild(MakeCommentElement(comment, layer + 1));
        })

    } catch (e) {
        console.error(e);
    } finally {
        loadMoreButton.classList.remove("is-loading");
    }
}

/**
 * 
 * @param {object} comment 
 * @param {HTMLElement} targetElement 
 */
function MakeCommentElement(comment, layer) {
    let commentElement = document.createElement("article");
    commentElement.classList.add("media");
    commentElement.setAttribute("data-comment", comment.id);
    commentElement.setAttribute("data-layer", layer || 0);

    let figure = document.createElement("figure");
    figure.classList.add("media-left");
    commentElement.appendChild(figure);

    let image = document.createElement("p");
    image.classList.add("image", "is-64x64");
    figure.appendChild(image);

    let img = document.createElement("img");
    img.classList.add("is-rounded");
    img.src = comment.author_image_url;
    image.appendChild(img);

    let mediaContent = document.createElement("div");
    mediaContent.classList.add("media-content");
    commentElement.appendChild(mediaContent);

    let content = document.createElement("div");
    content.classList.add("content");
    mediaContent.appendChild(content);

    let text = document.createElement("a");
    text.href = `/users/v/${comment.author_username}`;
    text.classList.add("hiddenLink");
    content.appendChild(text);

    let author = document.createElement("strong");
    author.innerText = comment.author_display_name;
    text.appendChild(author);

    let small = document.createElement("small");
    small.innerText = `@${comment.author_username} ${CreateSmartTimeString(comment.created_at)}`;
    small.classList.add("ml-2");
    text.appendChild(small);

    let preContent = document.createElement("pre");
    preContent.classList.add("noBackground", "comment");
    preContent.innerText = comment.content;
    content.appendChild(preContent);

    let interactionsNav = document.createElement("nav");
    interactionsNav.classList.add("level", "is-mobile");
    content.appendChild(interactionsNav);

    let interactionsContainer = document.createElement("div");
    interactionsContainer.classList.add("level-left");
    interactionsNav.appendChild(interactionsContainer);

    if (layer < 4) {
        let repliesContainer = document.createElement("div");
        repliesContainer.setAttribute("data-comment-type", "replies");
        repliesContainer.setAttribute("data-layer", layer);
        content.appendChild(repliesContainer);
    
        interactionsContainer.appendChild(CreateCommentButton(comment, "reply", () => {
            let section = commentElement.querySelector("[data-comment-type='section']");
            if (section) {
                section.remove();
                repliesContainer.innerHTML = "";
                return;
            }
            if (skips[comment.id]) {
                skips[comment.id] = 0;
            }
            if (repliesContainer.innerHTML != "") {
                repliesContainer.innerHTML = "";
            } else {
                MakeCommentSection(repliesContainer, comment.id);
                MakeLoadMoreButton(repliesContainer, comment.id);
                LoadMore(repliesContainer, comment.id);
            }
        }))
    }

    interactionsContainer.appendChild(CreateCommentButton(comment, comment.isLiked ? "award_star" : "star", async (e) => {
        let iconElem = e.currentTarget.querySelector("span.icon>span");
        let current = iconElem.innerText;
        iconElem.innerText = "hourglass";
        let res = await LikeComment(comment.id);
        
        if (!res) {
            iconElem.innerText = current;
            return;
        }

        if (res.isLiked) {
            iconElem.innerText = "award_star";
        } else {
            iconElem.innerText = "star";
        }
    }))

    if (comment.isAuthor) {
        let interactionsRight = document.createElement("div");
        interactionsRight.classList.add("level-right");
        interactionsNav.appendChild(interactionsRight);

        interactionsRight.appendChild(CreateCommentButton(comment, "delete", async (e) => {
            let iconElem = e.currentTarget.querySelector("span.icon>span");
            let current = iconElem.innerText;
            iconElem.innerText = "hourglass";

            let res = await DeleteComment(comment.id);
            if (!res) {
                iconElem.innerText = current;
                return;
            }

            commentElement.remove();
        }))
    }

    return commentElement;
}

function ResetAllLoads() {
    Object.keys(loadMoreButtons).forEach(btn => {
        if (btn != "_") {
            delete loadMoreButtons[btn];
        }
    })
    Object.keys(skips).forEach(skip => {
        if (skip != "") {
            delete skips[skip];
        }
    })
}

/**
 * 
 * @param {HTMLButtonElement} button 
 * @param {string} parent 
 * @param {string} content 
 */
async function CreateComment(button, parent, content) {
    try {
        button.classList.add("is-loading");

        let res = await fetch("/api/comments/add", {
            method: "POST",
            body: JSON.stringify({
                identifier: target,
                content,
                parent: parent || null
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return false;
        }

        return true;
    } catch (e) {
        console.error(e);
        return false;
    } finally {
        button.classList.remove("is-loading");
    }
}

function CreateCommentButton(comment, icon, onClick) {
    let levelElem = document.createElement("a");
    levelElem.classList.add("level-item");
    levelElem.href = "javascript:void(0);";
    if (onClick) {
        levelElem.addEventListener("click", onClick);
    }

    let iconElem = document.createElement("span");
    iconElem.classList.add("icon");
    levelElem.appendChild(iconElem);

    let iconText = document.createElement("span");
    iconText.innerText = icon;
    iconElem.appendChild(iconText);

    if (icon == "reply" && comment.replies > 0) {
        let additionalText = document.createElement("span");
        additionalText.innerText = `(${comment.replies.toLocaleString()})`;
        additionalText.classList.add("ml-1");
        levelElem.appendChild(additionalText);
    }

    if ((icon == "star" || icon == "award_star") && comment.likes > 0) {
        let additionalText = document.createElement("span");
        additionalText.innerText = `(${comment.likes.toLocaleString()})`;
        additionalText.classList.add("ml-1");
        levelElem.appendChild(additionalText);
    }

    return levelElem;
}

async function LikeComment(id) {
    try {

        if (!id) {
            return false;
        }

        let res = await fetch("/api/comments/like", {
            method: "POST",
            body: JSON.stringify({
                comment: id
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return false;
        }

        return json;

    } catch (e) {
        console.error(e);
        return false;
    }
}

async function DeleteComment(id) {
    try {

        if (!id) {
            return false;
        }

        let res = await fetch("/api/comments/delete", {
            method: "POST",
            body: JSON.stringify({
                comment: id
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return false;
        }

        return true;

    } catch (e) {
        console.error(e);
        return false;
    }
}
