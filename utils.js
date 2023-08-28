const { MAX_IN_PERIOD, AUTO_OFF, OFF } = require('./constants');

const calculateInitialStateForDay = ({ uniqueEvents, day, initialState }) => {
  const uniqueEventsWithDays = addComputedDayToEvents(uniqueEvents, day);

  if (day === 1) return initialState;

  /* We always want to check the closest event to the day before, not the current day */
  const event = findClosestPreviousEventToDay(uniqueEventsWithDays, day - 1);

  if (!event) return initialState;

  return event.state;
};

const addComputedDayToEvents = (events) =>
  events.map((event) => ({
    ...event,
    /* Add computed "day" to structure to simplify lookup & reduce repetitive inline computation */
    day: Math.ceil(event.timestamp / MAX_IN_PERIOD),
  }));

const findClosestPreviousEventToDay = (events, day) => {
  let closestPreviousEvent = null;

  /**
   * The reason we are walking backwards from the current day is that we could run into a scenario where
   * we have long stretches of time where the appliance is left on/off, and we need to find the closest
   * previous event to the current day, which may not have any corresponding events.
   */
  for (let i = day; i > 0; i--) {
    /**
     * We are using findLastIndex() instead of find(), as:
     * 1) There can be more than one event from the closest previous day, and we need the latest to
     *    determine the initialState for any arbitrary day
     * 2) find() only returns the first result, and we are after the last
     */
    const index = events.findLastIndex((event) => event.day === i);

    if (index !== -1) {
      closestPreviousEvent = events[index];
      break;
    }
  }

  return closestPreviousEvent;
};

const filterDuplicates = (event, index, events) => {
  if (index === 0) return true;

  const { state: prevState } = events[index - 1];

  return prevState !== event.state;
};

const filterRedundantOff = (event, index, events) => {
  if (index === 0) return true;

  const { state: prevState } = events[index - 1];

  if (prevState === AUTO_OFF && event.state === OFF) return false;

  return true;
};

const getBaseEvent = (initialState) => ({ timestamp: 0, state: initialState });

const getLastElementFromArr = (arr) =>
  arr.length > 0 ? arr[arr.length - 1] : null;

const isInteger = (number) => Number.isInteger(number);

module.exports = {
  getBaseEvent,
  getLastElementFromArr,
  findClosestPreviousEventToDay,
  filterDuplicates,
  filterRedundantOff,
  calculateInitialStateForDay,
  addComputedDayToEvents,
  isInteger,
};
