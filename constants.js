/* The maximum number of minutes in a period (a day) */
const MAX_IN_PERIOD = 1440;

const ON = 'on';
const OFF = 'off';
const AUTO_OFF = 'auto-off';
const MIN_DAYS = 1;
const MAX_DAYS = 31;
const FINAL_EVENT = { timestamp: MAX_IN_PERIOD, state: 'off' };

module.exports = {
  MAX_IN_PERIOD,
  ON,
  OFF,
  AUTO_OFF,
  FINAL_EVENT,
  MIN_DAYS,
  MAX_DAYS,
};
