export function trimStr(str, maxLength) {
  if (str === undefined || str === "") return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

export function getEmptyEventTemplate(allEvents, currentDay) {
  const emptyEvent = {
    id: nanoid(),
    name: "New Event " + allEvents.length,
    startingDate: dayjs.utc(currentDay),
    startingTime: "0000", // Time in 24h format. Determines when the event starts at the day of startingDate
    duration: 60 * 24, // Determines how long the event lasts, in minutes.
    isRecurring: false,
    recurEveryType: "days",
    recurEveryN: 1,
    recurWeekly_recurOnWeekDay: [], // Determines the day when the event should occur.
    recurMonthly_ConfigNum: 0,
    recurMonthly_recurOnDayNum: 1, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
    recurMonthly_recurOnWeekNum: 1, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
    recurMonthly_recurOnWeekDay: "Mon", // Determines the first day of month, e.g. first sunday / first sunday.
    recurYearly_ConfigNum: 0,
    recurYearly_recurOnMonth: "January", // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
    recurYearly_recurOnDayNum: 1, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
    recurYearly_recurOnWeekNum: 1, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
    recurYearly_recurOnWeekDay: "Mon", // Determines the week day in alternative config. E.g. on the N wednesday of X month.
    selectedEntities: [], // Just a string array of nodeIDs. All changes are within entity itself
    selectedOffers: [],
    segmentsWhitelist: [],
    comment: "",
    segmentsBlacklist: [],
    removed: false,
    isPaused: false,
    chipColor: "#fff",
  };
  return emptyEvent;
}
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}