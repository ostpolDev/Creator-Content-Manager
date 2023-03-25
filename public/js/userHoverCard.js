const userLinks = document.querySelectorAll("a[href]");
const userCard = document.getElementById("userCard");
const userCardLink = document.getElementById("userCardLink");
const userCardImage = document.getElementById("userCardImage");
const userCardHeader = document.getElementById("userCardHeader");
const userCardInfo = document.getElementById("userCardInfo");
const userCardNameText = document.getElementById("userCardNameText");

let registered = [];

userLinks.forEach(link => {

    RegisterHoverEvent(link);

});

async function GetUserInfo(id) {
    try {
        let res = await fetch("/api/users/getCardInfo/"+encodeURIComponent(id));
        let json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return undefined;
        }

        return json.info;
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

function RegisterHoverEvent(link) {
    if (registered.includes(link)) {
        return;
    }

    registered.push(link);
    if (!link.getAttribute("data-disable-hover") && link.href.includes("/users/v/")) {
        
        link.addEventListener("mouseover", (/**@type {MouseEvent} */ e) => {
            link.isMouseOver = true;
            link.hoverCardTimeout = setTimeout(async () => {
                if (link.isMouseOver) {
                    console.log("Showing card...");
                    
                    let parts = link.href.split("/");
                    let id = parts[parts.length - 1];

                    let info = await GetUserInfo(id);
                    userCardImage.src = info.avatarUrl;
                    userCardHeader.innerText = info.username;
                    userCardInfo.innerText = `${numberWithCommas(info.assetCount)} assets uploaded`;
                    userCardNameText.innerText = info.name;

                    userCard.style.top = e.pageY + "px";
                    userCard.style.left = e.pageX + "px";
                    userCard.style.opacity = 1;
                }
            }, 500)
        })

        link.addEventListener("mouseout", () => {
            link.isMouseOver = false;
            if (link.hoverCardTimeout) {
                clearTimeout(link.hoverCardTimeout);
                userCard.style.opacity = 0;
            }
        })

    }
}


function numberWithCommas(x) {
    if (!x) {
        return x;
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}