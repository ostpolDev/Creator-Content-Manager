let allSelects = document.querySelectorAll("select");

allSelects.forEach(sel => {
    let option = sel.querySelector("option[data-selected='true']");
    if (option) {
        option.setAttribute("selected", true);
    }
})