const plannedRelease = document.getElementById("plannedRelease");
let startDate = null;

if (DEF.uploaded) {
    const date = new Date(DEF.uploaded);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    startDate = date;
}

const calendars = bulmaCalendar.attach('[type="datetime"', {displayMode: "dialog", startDate});

