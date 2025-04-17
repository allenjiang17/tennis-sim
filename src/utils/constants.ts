export const COURT_WIDTH = 8.23; // in meters
export const COURT_LENGTH = 23.77; // in meters
export const SERVE_BOX_LENGTH = 6.4;//

export const NET_HEIGHT = 0.914; // in meters
export const NET_POSITION_ALONG_LENGTH = 11.88; // in meters from the baseline

export const MPH_TO_MPS = 0.44704; // conversion factor from miles per hour to meters per second

export const SERVE_HEIGHT = 2.5; // in meters
export const SERVE_POSITION_DIFF = 1; // in meters from center line
export const RETURN_POSITION_DIFF = 3; // in meters from center line

export const INITIAL_PLAYER_LOCATION = {
  x: 0,
  y: COURT_LENGTH/2,
};
export const INITIAL_OPPONENT_LOCATION = {
  x: 0,
  y: -COURT_LENGTH/2,
};


/***PHYSICS CONSTANTS */
export const G = 9.81;
export const M = 0.057;
export const K_D = 0.00003; //drag coeff
export const K_M = 0.00006; //magnus drag coeff
export const ENERGY_LOSS = 0.9;
export const FRICTION_LOSS = 0.80;
