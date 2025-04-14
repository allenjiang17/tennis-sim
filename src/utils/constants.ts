export const COURT_WIDTH = 8.23; // in meters
export const COURT_LENGTH = 23.77; // in meters

export const NET_HEIGHT = 0.914; // in meters
export const NET_POSITION_ALONG_LENGTH = 11.88; // in meters from the baseline

export const MPH_TO_MPS = 0.44704; // conversion factor from miles per hour to meters per second

export const INITIAL_PLAYER_LOCATION = {
  x: 0,
  y: COURT_LENGTH/2,
};
export const INITIAL_OPPONENT_LOCATION = {
  x: 0,
  y: -COURT_LENGTH/2,
};