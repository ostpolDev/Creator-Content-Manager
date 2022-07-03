let contextMenu = document.getElementById("contextMenu");
let contextSpecific = document.getElementById("contextSpecific");
let specificDivider = document.getElementById("specificDivider");

let highlighted;

setContextActive(false);

document.addEventListener("scroll", (e) => {
    setContextActive(false);
})

document.addEventListener("contextmenu", (e) => {
    if (!e.ctrlKey) {
        e.preventDefault();
    }
})

document.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        if (e.target.closest("#contextMenu") !== contextMenu) {
            setContextActive(false);
        }
    }
    if (e.button === 2 && !e.ctrlKey) {

        if (highlighted) {
            highlighted.classList.remove("highlighted");
            highlighted = undefined;
        }

        contextSpecific.innerHTML = "";
        let specific = getExtraContext(e.target, e);
        if (specific) {
            if (!Array.isArray(specific)) {
                specific = [specific];
            }

            if (specific.length > 0) {
                highlighted = e.target;
                highlighted.classList.add("highlighted");

                specificDivider.classList.remove("is-hidden");
                specific.forEach(elem => {
                    let linkElem = document.createElement("a");
                    linkElem.classList.add("item");

                    if (elem.icon) {
                        let iconElement = document.createElement("i");
                        iconElement.classList.add("icon");

                        if (Array.isArray(elem.icon)) {
                            elem.icon.forEach(i => {
                                iconElement.classList.add(i);
                            })
                        } else {
                            iconElement.classList.add(elem.icon);
                        }
                        linkElem.appendChild(iconElement);
                    }


                    let spanElement = document.createElement("span");
                    spanElement.innerText = elem.text;

                    linkElem.appendChild(spanElement);

                    linkElem.addEventListener("click", (_e) => {
                        elem.event(_e, e);
                        setContextActive(false);
                    });

                    contextSpecific.appendChild(linkElem);
                })
            } else {
                specificDivider.classList.add("is-hidden");
            }
        } else {
            specificDivider.classList.add("is-hidden");
        }


        setContextActive(true);

        let width = contextMenu.offsetWidth;
        let height = contextMenu.offsetHeight;

        let domWidth = document.body.clientWidth;
        let domHeight = document.body.clientHeight;
        
        let x = e.clientX;
        let y = e.clientY;

        if (x + width > domWidth) {
            x = (domWidth - width)
        }

        if (y + height > domHeight) {
            y = (domHeight - height);
        }

        contextMenu.style.top = pixels(y);
        contextMenu.style.left = pixels(x);
    }
})

function getExtraContext(/** @type {HTMLElement} */ element , /** @type {MouseEvent} */ event) {
    let type = element.nodeName;
    let data = element.getAttribute("data-context");

    let menus = [];

    let customName = element.getAttribute("data-context-name");
    let customIcon = element.getAttribute("data-context-icon");
    let customFunction = element.getAttribute("data-context-function");
    let customLink = element.getAttribute("data-context-link");
    let customSource = element.getAttribute("data-context-source");
    let target = element.getAttribute("data-context-target");
    let targetElem;

    if (!customName && !customSource) {
        targetElem = element.closest("[data-context-name],[data-context-source]");
        if (targetElem) {
            customName = targetElem.getAttribute("data-context-name");
            customIcon = targetElem.getAttribute("data-context-icon");
            customFunction = targetElem.getAttribute("data-context-function");
            customLink = targetElem.getAttribute("data-context-link");
            customSource = targetElem.getAttribute("data-context-source");
            target = element.getAttribute("data-context-target");
        }
    }
    
    if (customName && (customFunction || customLink)) {
        menus.push({
            icon: customIcon ? customIcon.split(" ") : "",
            text: customName,
            event: (linkEvent, pointerEvent) => {
                if (customFunction) {
                    executeFunctionByName(customFunction, window, linkEvent, pointerEvent);
                } else {
                    if (target) {
                        window.open(customLink, target);
                    } else {
                        window.location = customLink;
                    }
                }
            }
        })
    }

    if (customSource) {
        try {
            let customSourceMenus = executeFunctionByName(customSource, window, event, targetElem ? targetElem : element);
            if (customSourceMenus) {
                if (!Array.isArray(customSourceMenus)) {
                    customSourceMenus = [customSourceMenus];
                }
                if (customSourceMenus && customSourceMenus.length > 0) {
                    menus.push(...customSourceMenus);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (data) {
        switch(data) {
            case "disable":
                return;
            case "use-alt":
                if (!event.altKey) {
                    return;
                }
            default:
                break;
        }
    }

    switch (type) {
        case "IMG":
            menus.push({
                icon: "image",
                text: "Open Image",
                event: (linkEvent, pointerEvent) => {
                    if (pointerEvent.target.src) {
                        window.open(pointerEvent.target.src, '_blank').focus();
                    }
                }
            })
            break;
        case "A":
            menus.push({
                icon: ["external", "alternate"],
                text: "Open in new Tab",
                event: (linkEvent, pointerEvent) => {
                    if (pointerEvent.target.href) {
                        window.open(pointerEvent.target.href, '_blank').focus();
                    }
                }
            });
            menus.push({
                icon: "copy",
                text: "Copy Text",
                event: (linkEvent, pointerEvent) => {
                    let text = pointerEvent.target.innerText;
                    copyTextToClipboard(text);
                }
            });
            menus.push({
                icon: "copy",
                text: "Copy Link",
                event: (linkEvent, pointerEvent) => {
                    let text = pointerEvent.target.href;
                    copyTextToClipboard(text);
                }
            });
            break;
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "P":
        case "SPAN":
            menus.push({
                icon: "copy",
                text: "Copy",
                event: (linkEvent, pointerEvent) => {
                    let text = pointerEvent.target.innerText;
                    copyTextToClipboard(text);
                }
            });
            break;
        case "INPUT":
            let inputType = element.getAttribute("type");
            if (inputType && inputType !== "password") {
                menus.push({
                    icon: "copy",
                    text: "Copy value",
                    event: (linkevent, pointerEvent) => {
                        let value = pointerEvent.target.value;
                        copyTextToClipboard(value);
                    }
                })
            }
            menus.push({
                icon: "paste",
                text: "Paste",
                event: (linkevent, pointerEvent) => {
                    if (pointerEvent.target) {
                        pasteTextFromClipboard((value) => {
                            pointerEvent.target.value = value;
                        })
                    }
                }
            })
            menus.push({
                icon: "trash",
                text: "Clear value",
                event: (linkevent, pointerEvent) => {
                    if (pointerEvent.target.value) {
                        pointerEvent.target.value = "";
                    }
                }
            })
            let submitButtonId = element.getAttribute("data-context-submit");
            if (submitButtonId) {
                menus.push({
                    icon: "check",
                    text: "Submit",
                    event: (linkevent, pointerEvent) => {
                        let submitButtonElement = document.getElementById(submitButtonId);
                        if (submitButtonElement) {
                            submitButtonElement.click();
                        }
                    }
                })
            }
        default:
            break;
    }

    // Check if the clicked element is inside of a modal
    let closestModal = element.closest(".modal");
    if (closestModal) {
        // The right-clicked element is inside of a modal. Add option to close it.
        menus.push({
            icon: "close",
            text: "Close Modal",
            event: (linkEvent, pointerEvent) => {
                openModal(closestModal, false);
            }
        })
    }

    return menus;
}

function handlePermission(permission, response) {
    navigator.permissions.query({name: permission}).then(function(result) {
        if (result.state !== "prompt") {
            response(result.state);
        } else {
            result.addEventListener("change", (e) => {
                response(e.state);
            })
        }
    });
  }

function setContextActive(active) {
    if (active) {
        contextMenu.classList.add("active");
        contextMenu.style.transform = "scale(1)";
        contextMenu.style.opacity = 1;
    } else {
        contextMenu.style.transform = "scale(0)";
        contextMenu.style.opacity = 0;
        contextMenu.classList.remove("active");
        if (highlighted) {
            highlighted.classList.remove("highlighted");
            highlighted = undefined;
        }
    }
}

function pixels(number) {
    return `${number}px`;
}

// https://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
function executeFunctionByName(functionName, context /*, args */) {
    var args = Array.prototype.slice.call(arguments, 2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }
    return context[func].apply(context, args);
}

function copyTextToClipboard(text) {
    console.log("Copying text to clipboard...", text);
    if (text) {
        if (text.length > 99999) {
            text = text.substring(0, 99999);
        }
        handlePermission('clipboard-write', (state) => {
            if (state === "granted") {
                navigator.clipboard.writeText(text);
            } else {
                console.log("Could not copy text to clipboard. Permission denied by browser");
            }
        });
        // 
    }
}

function pasteTextFromClipboard(res) {
    handlePermission('clipboard-read', (state) => {
        if (state === "granted") {
            navigator.clipboard.readText().then((value) => {
                res(value);
            }).catch((e) => {
                console.error("Could not read from clipboard", e)
            });
        } else {
            console.log("Could not read text from clipboard. Permission denied by browser");
        }
    });
}