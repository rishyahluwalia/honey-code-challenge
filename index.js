const {
  MAX_IN_PERIOD,
  ON,
  OFF,
  FINAL_EVENT,
  AUTO_OFF,
  MIN_DAYS,
  MAX_DAYS,
} = require('./constants');
const {
  getBaseEvent,
  getLastElementFromArr,
  filterDuplicates,
  filterRedundantOff,
  calculateInitialStateForDay,
  addComputedDayToEvents,
  isInteger,
} = require('./utils');

/**
 * PART 1
 *
 * You have an appliance that uses energy, and you want to calculate how
 * much energy it uses over a period of time.
 *
 * As an input to your calculations, you have a series of events that contain
 * a timestamp and the new state (on or off). You are also given the initial
 * state of the appliance. From this information, you will need to calculate
 * the energy use of the appliance i.e. the amount of time it is switched on.
 *
 * The amount of energy it uses is measured in 1-minute intervals over the
 * period of a day. Given there is 1440 minutes in a day (24 * 60), if the
 * appliance was switched on the entire time, its energy usage would be 1440.
 * To simplify calculations, timestamps range from 0 (beginning of the day)
 * to 1439 (last minute of the day).
 *
 * HINT: there is an additional complication with the last two tests that
 * introduce spurious state change events (duplicates at different time periods).
 * Focus on getting these tests working after satisfying the first tests.
 *
 * The structure for `profile` looks like this (as an example):
 * ```
 * {
 *    initial: 'on',
 *    events: [
 *      { state: 'off', timestamp: 50 },
 *      { state: 'on', timestamp: 304 },
 *      { state: 'off', timestamp: 600 },
 *    ]
 * }
 * ```
 */

const calculateEnergyUsageSimple = (profile) => {
  const { initial: initialState, events } = profile;
  const latestEvent = getLastElementFromArr(events);
  let totalOffTimestamps = 0;
  let totalOnTimestamps = 0;

  /* Pad the stream of events with a start and conditional end event */
  const paddedEvents = [
    getBaseEvent(initialState),
    ...events,
    ...(latestEvent?.state !== OFF ? [FINAL_EVENT] : []),
  ];

  const uniqueEvents = paddedEvents.filter(filterDuplicates);

  uniqueEvents.forEach(({ state, timestamp }) => {
    if (state === OFF) {
      totalOffTimestamps += timestamp;
    } else if (state === ON) {
      totalOnTimestamps += timestamp;
    } else {
      throw new Error(`INVALID_DATA: "${state}" state not supported`);
    }
  });

  return totalOffTimestamps - totalOnTimestamps;
};

/**
 * PART 2
 *
 * You purchase an energy-saving device for your appliance in order
 * to cut back on its energy usage. The device is smart enough to shut
 * off the appliance after it detects some period of disuse, but you
 * can still switch on or off the appliance as needed.
 *
 * You are keen to find out if your shiny new device was a worthwhile
 * purchase. Its success is measured by calculating the amount of
 * energy *saved* by device.
 *
 * To assist you, you now have a new event type that indicates
 * when the appliance was switched off by the device (as opposed to switched
 * off manually). Your new states are:
 * * 'on'
 * * 'off' (manual switch off)
 * * 'auto-off' (device automatic switch off)
 *
 * (The `profile` structure is the same, except for the new possible
 * value for `initial` and `state`.)
 *
 * Write a function that calculates the *energy savings* due to the
 * periods of time when the device switched off your appliance. You
 * should not include energy saved due to manual switch offs.
 *
 * You will need to account for redundant/non-sensical events e.g.
 * an off event after an auto-off event, which should still count as
 * an energy savings because the original trigger was the device
 * and not manual intervention.
 */

const calculateEnergySavings = (profile) => {
  const { initial: initialState, events } = profile;
  const latestEvent = getLastElementFromArr(events);
  let totalSavings = 0;

  /* Pad the stream of events with a start and conditional end event */
  const paddedEvents = [
    getBaseEvent(initialState),
    ...events,
    ...(latestEvent?.state !== OFF ? [FINAL_EVENT] : []),
  ];

  const uniqueEvents = paddedEvents.filter(filterDuplicates);

  /**
   * For now we are only removing "redundant off" events, but in future more
   * filters can be added to "sanitisedEvents" to remove non-sensical data.
   */
  const sanitisedEvents = uniqueEvents.filter(filterRedundantOff);

  sanitisedEvents.forEach(({ state, timestamp }, index) => {
    /* No need to check if nextEvent is "on" as we have filtered redundant offs above */
    if (state === AUTO_OFF) {
      const isLastEvent = index === sanitisedEvents.length - 1;

      if (isLastEvent) {
        totalSavings += MAX_IN_PERIOD - timestamp;
      } else {
        const nextEvent = sanitisedEvents[index + 1];
        totalSavings += nextEvent.timestamp - timestamp;
      }
    }
  });

  return totalSavings;
};

/**
 * PART 3
 *
 * The process of producing metrics usually requires handling multiple days of data. The
 * examples so far have produced a calculation assuming the day starts at '0' for a single day.
 *
 * In this exercise, the timestamp field contains the number of minutes since an
 * arbitrary point in time (the "Epoch"). To simplify calculations, assume:
 *  - the Epoch starts at the beginning of the month (i.e. midnight on day 1 is timestamp 0)
 *  - our calendar simply has uniform length 'days' - the first day is '1' and the last day is '365'
 *  - the usage profile data will not extend more than one month
 *
 * Your function should calculate the energy usage over a particular day, given that
 * day's number. It will have access to the usage profile over the month.
 *
 * It should also throw an error if the day value is invalid i.e. if it is out of range
 * or not an integer. Specific error messages are expected - see the tests for details.
 *
 * (The `profile` structure is the same as part 1, but remember that timestamps now extend
 * over multiple days)
 *
 * HINT: You are encouraged to re-use `calculateEnergyUsageSimple` from PART 1 by
 * constructing a usage profile for that day by slicing up and rewriting up the usage profile you have
 * been given for the month.
 */

const calculateEnergyUsageForDay = (monthUsageProfile, day) => {
  if (!isInteger(day)) throw new Error('must be an integer');
  if (day < MIN_DAYS || day > MAX_DAYS) throw new Error('day out of range');

  const { initial: initialState, events } = monthUsageProfile;

  const uniqueEvents = events.filter(filterDuplicates);

  /* Denormalise events with computed day */
  const uniqueEventsWithDays = addComputedDayToEvents(uniqueEvents, day);

  const dayProfileEvents = uniqueEventsWithDays
    /* Remove redundant days */
    .filter((event) => event.day === day)
    /* Remove computed "day" to match the profile's required "event" struture */
    .map((event) => ({
      state: event.state,
      /* Convert timestamps to be relative to the day for better re-usability with "calculateEnergyUsageSimple" */
      timestamp: event.timestamp - MAX_IN_PERIOD * (event.day - 1),
    }));

  const dayProfile = {
    initial: calculateInitialStateForDay({ uniqueEvents, day, initialState }),
    events: dayProfileEvents,
  };

  return calculateEnergyUsageSimple(dayProfile);
};

module.exports = {
  calculateEnergyUsageSimple,
  calculateEnergySavings,
  calculateEnergyUsageForDay,
};
