const yearInput = document.getElementById("yearInput");
const monthSelect = document.getElementById("monthSelect");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");

const channelIndex = document.getElementById("channelIndex");
const infoModalBody = document.getElementById("infoModalBody");
const infoModalTitle = document.getElementById("infoModalTitle");

const calendar = document.querySelector(".calendar");

/**
 * @type {[HTMLElement]}
 */
let dayElements = [];

let currentDate = new Date();

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLORS = ["#ec273f", "#e98537", "#5ab552", "#3859b3", "#3e3b65", "#9a4d76", "#ffa2ac"];
const CHANNEL_LOOKUP = {};
const CHANNEL_NAME_LOOKUP = {};

let dayIndexLookup = {};
let currentVideos = [];
let currentVideoLookup = {};

const CURRENT = new Date();

async function Initialize() {

    await LoadChannels();

    const params = new URLSearchParams(window.location.search);
    if (params.get("date")) {
        try {
            currentDate = new Date(params.get("date"));
        } catch (e) {
            console.error(e);
        }
    }

    yearInput.value = currentDate.getFullYear();
    monthSelect.value = currentDate.getMonth();

    for (let i = 0; i < 7 * 6; i++) {

        const dayElement = document.createElement("div");
        dayElement.classList.add("day");
        dayElement.setAttribute("data-index", i);
        calendar.appendChild(dayElement);

        const dayNumber = document.createElement("span");
        dayNumber.classList.add("number");
        dayNumber.innerText = i;
        dayElement.appendChild(dayNumber);

        const dayNameElem = document.createElement("span");
        dayNameElem.classList.add("name");
        dayElement.appendChild(dayNameElem);

        const videoContainer = document.createElement("div");
        videoContainer.classList.add("videos");
        dayElement.appendChild(videoContainer);

        dayElement.addEventListener("click", () => {
            ShowEventInfo(dayElement);
        })

        dayElements.push(dayElement);
    }

    UpdateElements();
}
Initialize();

async function UpdateElements() {
    currentVideos = [];
    currentVideoLookup = {};

    const firstDay = new Date();
    firstDay.setFullYear(currentDate.getFullYear());
    firstDay.setMonth(currentDate.getMonth());
    firstDay.setDate(1);

    const lastDay = new Date(firstDay.getTime());
    lastDay.setMonth(lastDay.getMonth() + 1);
    lastDay.setDate(lastDay.getDate() - 1);

    const prevMonth = new Date(firstDay.getTime());
    prevMonth.setDate(prevMonth.getDate() - 1);

    dayIndexLookup = {};

    for (let i = 0; i < dayElements.length; i++) {
        const elem = dayElements[i];
        const numberElem = elem.querySelector(".number");
        const videoContainer = elem.querySelector(".videos");
        videoContainer.innerHTML = "";

        if (i < firstDay.getDay() || i >= firstDay.getDay() + lastDay.getDate()) {
            // Reset field
            elem.classList.remove("active");

            if (i < firstDay.getDay()) {
                numberElem.innerText = prevMonth.getDate() - (firstDay.getDay() - i - 1);
            } else {
                numberElem.innerText = i + 1 - (lastDay.getDate() + firstDay.getDay());
            }

            elem.setAttribute("data-date", "-1");

            continue;
        }
        
        const dateIndex = i - firstDay.getDay() + 1; 
        numberElem.innerText = dateIndex;

        elem.setAttribute("data-date", dateIndex);
        dayIndexLookup[dateIndex] = i;

        const newDate = new Date(firstDay.getTime());
        newDate.setDate(dateIndex);

        if (newDate.getFullYear() == CURRENT.getFullYear() && newDate.getDate() == CURRENT.getDate() && newDate.getMonth() == CURRENT.getMonth()) {
            elem.classList.add("current");
        } else {
            elem.classList.remove("current");
        }

        const dayName = elem.querySelector("span.name");
        dayName.innerText = DAY_NAMES[newDate.getDay()];

        elem.classList.add("active");
    }

    await GetReleases();
}

prevMonthButton.addEventListener("click", () => {
    const newDate = new Date(currentDate.getTime());
    newDate.setMonth(newDate.getMonth() - 1);
    monthSelect.value = newDate.getMonth();
    currentDate.setMonth(newDate.getMonth());
    currentDate.setFullYear(newDate.getFullYear())
    yearInput.value = newDate.getFullYear();
    UpdateElements();
})

nextMonthButton.addEventListener("click", () => {
    const newDate = new Date(currentDate.getTime());
    newDate.setMonth(newDate.getMonth() + 1);
    monthSelect.value = newDate.getMonth();
    currentDate.setMonth(newDate.getMonth());
    currentDate.setFullYear(newDate.getFullYear())
    yearInput.value = newDate.getFullYear();
    UpdateElements();
})

monthSelect.addEventListener("input", () => {
    currentDate.setMonth(monthSelect.value);
    UpdateElements();
})

let yearUpdateDelay;

yearInput.addEventListener("input", () => {
    clearTimeout(yearUpdateDelay);
    yearUpdateDelay = setTimeout(() => {
        currentDate.setFullYear(yearInput.value);
        UpdateElements();
    }, 200)
})

async function LoadChannels() {
    try {
        const res = await fetch("/api/channels/list");
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        json.items.forEach((channel, i) => {
            CHANNEL_LOOKUP[channel.id] = i;
            CHANNEL_NAME_LOOKUP[channel.id] = channel.name;
            channelIndex.innerHTML += `
                <span class="item">
                    <div class="color" style="background-color: ${COLORS[i]}"></div>
                    <span>${channel.name}</span>
                </span>
            `;
        })

    } catch (e) {
        console.error(e);
    }
}

async function GetReleases() {
    try {

        const res = await fetch(`/api/videos/list/date/${encodeURIComponent(currentDate.getFullYear())}/${encodeURIComponent(currentDate.getMonth())}`)
        const json = await res.json();

        if (!json.success) {
            console.error(json.msg || "Something went wrong...");
            return;
        }

        currentVideos = json.videos;

        currentVideos.forEach((video, i) => {
            const releaseDate = new Date(video.release_date);
            const elem = dayElements[dayIndexLookup[releaseDate.getDate()]];
            const videoContainer = elem.querySelector(".videos");

            if (!currentVideoLookup[releaseDate.getDate()]) {
                currentVideoLookup[releaseDate.getDate()] = [];
            }

            currentVideoLookup[releaseDate.getDate()].push(i);

            const videoElem = document.createElement("span");
            videoElem.style.backgroundColor = COLORS[CHANNEL_LOOKUP[video.channel]];
            videoContainer.appendChild(videoElem);
        })

    } catch (e) {
        console.error(e);
    }
}


/**
 * 
 * @param {HTMLElement} elem 
 */
function ShowEventInfo(elem) {
    const attr = elem.getAttribute("data-date");
    if (!attr) {
        return;
    }

    const videoIndices = currentVideoLookup[attr];
    const date = new Date(currentDate);
    date.setDate(attr);

    infoModalTitle.innerHTML = moment(date).format("dddd, MMMM Do YYYY");
    infoModalBody.innerHTML = "";

    videoIndices.forEach(videoID => {
        const video = currentVideos[videoID];
        infoModalBody.innerHTML += `
            <tr>
                <td>${CHANNEL_NAME_LOOKUP[video.channel]}</td>
                <td>
                    <a href="/videos/v/${video.id}">${video.title}</a>
                </td>
            </tr>
        `;
    })

    SetModalOpen("#infoModal", true)
}
