// ============================================
// Monopoly India — Board Configuration
// ============================================

import { Tile, Card } from '../../../shared/src/types';

export const BOARD_SIZE = 40;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;
export const STARTING_MONEY = 1500;
export const MAX_HOUSES = 4;
export const HOTEL = 5;

// Full 40-tile board
export function createBoard(): Tile[] {
  return [
    // --- BOTTOM ROW (right to left) ---
    { index: 0, type: 'GO', name: 'Start' },
    {
      index: 1, type: 'PROPERTY', name: 'Varanasi', colorGroup: 'brown',
      price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50,
      mortgageValue: 30, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 2, type: 'COMMUNITY', name: 'Surprise' },
    {
      index: 3, type: 'PROPERTY', name: 'Jaipur', colorGroup: 'brown',
      price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50,
      mortgageValue: 30, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 4, type: 'TAX', name: 'Income Tax', amount: 200 },
    {
      index: 5, type: 'RAILROAD', name: 'Delhi Airport',
      price: 200, mortgageValue: 100, ownerId: null, mortgaged: false,
    },
    {
      index: 6, type: 'PROPERTY', name: 'Nashik', colorGroup: 'lightblue',
      price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50,
      mortgageValue: 50, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 7, type: 'CHANCE', name: 'Chance' },
    {
      index: 8, type: 'PROPERTY', name: 'Agra', colorGroup: 'lightblue',
      price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50,
      mortgageValue: 50, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 9, type: 'PROPERTY', name: 'Amritsar', colorGroup: 'lightblue',
      price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50,
      mortgageValue: 60, ownerId: null, mortgaged: false, houses: 0,
    },

    // --- LEFT COLUMN (bottom to top) ---
    { index: 10, type: 'JAIL', name: 'Jail' },
    {
      index: 11, type: 'PROPERTY', name: 'Ahmedabad', colorGroup: 'pink',
      price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100,
      mortgageValue: 70, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 12, type: 'UTILITY', name: 'Electricity Board',
      price: 150, mortgageValue: 75, ownerId: null, mortgaged: false,
    },
    {
      index: 13, type: 'PROPERTY', name: 'Surat', colorGroup: 'pink',
      price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100,
      mortgageValue: 70, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 14, type: 'PROPERTY', name: 'Lucknow', colorGroup: 'pink',
      price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100,
      mortgageValue: 80, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 15, type: 'RAILROAD', name: 'Mumbai Airport',
      price: 200, mortgageValue: 100, ownerId: null, mortgaged: false,
    },
    {
      index: 16, type: 'PROPERTY', name: 'Chandigarh', colorGroup: 'orange',
      price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100,
      mortgageValue: 90, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 17, type: 'COMMUNITY', name: 'Surprise' },
    {
      index: 18, type: 'PROPERTY', name: 'Indore', colorGroup: 'orange',
      price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100,
      mortgageValue: 90, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 19, type: 'PROPERTY', name: 'Bhopal', colorGroup: 'orange',
      price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100,
      mortgageValue: 100, ownerId: null, mortgaged: false, houses: 0,
    },

    // --- TOP ROW (left to right) ---
    { index: 20, type: 'FREE_PARKING', name: 'Vacation' },
    {
      index: 21, type: 'PROPERTY', name: 'Kochi', colorGroup: 'red',
      price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150,
      mortgageValue: 110, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 22, type: 'CHANCE', name: 'Chance' },
    {
      index: 23, type: 'PROPERTY', name: 'Coimbatore', colorGroup: 'red',
      price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150,
      mortgageValue: 110, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 24, type: 'PROPERTY', name: 'Chennai', colorGroup: 'red',
      price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150,
      mortgageValue: 120, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 25, type: 'RAILROAD', name: 'Kolkata Airport',
      price: 200, mortgageValue: 100, ownerId: null, mortgaged: false,
    },
    {
      index: 26, type: 'PROPERTY', name: 'Hyderabad', colorGroup: 'yellow',
      price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150,
      mortgageValue: 130, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 27, type: 'PROPERTY', name: 'Visakhapatnam', colorGroup: 'yellow',
      price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150,
      mortgageValue: 130, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 28, type: 'UTILITY', name: 'Water Works',
      price: 150, mortgageValue: 75, ownerId: null, mortgaged: false,
    },
    {
      index: 29, type: 'PROPERTY', name: 'Pune', colorGroup: 'yellow',
      price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150,
      mortgageValue: 140, ownerId: null, mortgaged: false, houses: 0,
    },

    // --- RIGHT COLUMN (top to bottom) ---
    { index: 30, type: 'GO_TO_JAIL', name: 'Go to Jail' },
    {
      index: 31, type: 'PROPERTY', name: 'Bengaluru', colorGroup: 'green',
      price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200,
      mortgageValue: 150, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 32, type: 'PROPERTY', name: 'Goa', colorGroup: 'green',
      price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200,
      mortgageValue: 150, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 33, type: 'COMMUNITY', name: 'Surprise' },
    {
      index: 34, type: 'PROPERTY', name: 'Kolkata', colorGroup: 'green',
      price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200,
      mortgageValue: 160, ownerId: null, mortgaged: false, houses: 0,
    },
    {
      index: 35, type: 'RAILROAD', name: 'Bengaluru Airport',
      price: 200, mortgageValue: 100, ownerId: null, mortgaged: false,
    },
    { index: 36, type: 'CHANCE', name: 'Chance' },
    {
      index: 37, type: 'PROPERTY', name: 'Delhi', colorGroup: 'darkblue',
      price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200,
      mortgageValue: 175, ownerId: null, mortgaged: false, houses: 0,
    },
    { index: 38, type: 'TAX', name: 'Luxury Tax', amount: 100 },
    {
      index: 39, type: 'PROPERTY', name: 'Mumbai', colorGroup: 'darkblue',
      price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200,
      mortgageValue: 200, ownerId: null, mortgaged: false, houses: 0,
    },
  ];
}

// Color group mapping for monopoly checks
export const COLOR_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39],
};

// Railroad indices
export const RAILROAD_INDICES = [5, 15, 25, 35];

// Utility indices
export const UTILITY_INDICES = [12, 28];

// Chance Cards
export function createChanceCards(): Card[] {
  return [
    { id: 'ch1', type: 'CHANCE', text: 'Advance to Start (Collect ₹200)', action: { type: 'MOVE_TO', position: 0 } },
    { id: 'ch2', type: 'CHANCE', text: 'Advance to Mumbai. If you pass Start, collect ₹200.', action: { type: 'MOVE_TO', position: 39 } },
    { id: 'ch3', type: 'CHANCE', text: 'Advance to Delhi. If you pass Start, collect ₹200.', action: { type: 'MOVE_TO', position: 37 } },
    { id: 'ch4', type: 'CHANCE', text: 'Advance to Kochi. If you pass Start, collect ₹200.', action: { type: 'MOVE_TO', position: 21 } },
    { id: 'ch5', type: 'CHANCE', text: 'Advance to nearest Airport.', action: { type: 'MOVE_TO_NEAREST', tileType: 'RAILROAD' } },
    { id: 'ch6', type: 'CHANCE', text: 'Bank pays you dividend of ₹50.', action: { type: 'COLLECT', amount: 50 } },
    { id: 'ch7', type: 'CHANCE', text: 'Get Out of Jail Free card.', action: { type: 'GET_OUT_OF_JAIL' } },
    { id: 'ch8', type: 'CHANCE', text: 'Go Back 3 Spaces.', action: { type: 'MOVE_BACK', spaces: 3 } },
    { id: 'ch9', type: 'CHANCE', text: 'Go to Jail. Do not pass Start, do not collect ₹200.', action: { type: 'GO_TO_JAIL' } },
    { id: 'ch10', type: 'CHANCE', text: 'Make general repairs on all your properties: ₹25 per house, ₹100 per hotel.', action: { type: 'REPAIRS', housePrice: 25, hotelPrice: 100 } },
    { id: 'ch11', type: 'CHANCE', text: 'Pay poor tax of ₹15.', action: { type: 'PAY', amount: 15 } },
    { id: 'ch12', type: 'CHANCE', text: 'Take a trip to Delhi Airport. If you pass Start, collect ₹200.', action: { type: 'MOVE_TO', position: 5 } },
    { id: 'ch13', type: 'CHANCE', text: 'You have been elected Chairman of the Board. Pay each player ₹50.', action: { type: 'PAY_EACH_PLAYER', amount: 50 } },
    { id: 'ch14', type: 'CHANCE', text: 'Your building loan matures. Collect ₹150.', action: { type: 'COLLECT', amount: 150 } },
    { id: 'ch15', type: 'CHANCE', text: 'Advance to nearest Utility.', action: { type: 'MOVE_TO_NEAREST', tileType: 'UTILITY' } },
  ];
}

// Community / Surprise Cards
export function createCommunityCards(): Card[] {
  return [
    { id: 'cc1', type: 'COMMUNITY', text: 'Advance to Start (Collect ₹200).', action: { type: 'MOVE_TO', position: 0 } },
    { id: 'cc2', type: 'COMMUNITY', text: 'Bank error in your favour. Collect ₹200.', action: { type: 'COLLECT', amount: 200 } },
    { id: 'cc3', type: 'COMMUNITY', text: 'Doctor\'s fees. Pay ₹50.', action: { type: 'PAY', amount: 50 } },
    { id: 'cc4', type: 'COMMUNITY', text: 'From sale of stock you get ₹50.', action: { type: 'COLLECT', amount: 50 } },
    { id: 'cc5', type: 'COMMUNITY', text: 'Get Out of Jail Free card.', action: { type: 'GET_OUT_OF_JAIL' } },
    { id: 'cc6', type: 'COMMUNITY', text: 'Go to Jail. Do not pass Start, do not collect ₹200.', action: { type: 'GO_TO_JAIL' } },
    { id: 'cc7', type: 'COMMUNITY', text: 'Holiday fund matures. Receive ₹100.', action: { type: 'COLLECT', amount: 100 } },
    { id: 'cc8', type: 'COMMUNITY', text: 'Income tax refund. Collect ₹20.', action: { type: 'COLLECT', amount: 20 } },
    { id: 'cc9', type: 'COMMUNITY', text: 'It is your birthday. Collect ₹10 from every player.', action: { type: 'COLLECT_FROM_EACH_PLAYER', amount: 10 } },
    { id: 'cc10', type: 'COMMUNITY', text: 'Life insurance matures. Collect ₹100.', action: { type: 'COLLECT', amount: 100 } },
    { id: 'cc11', type: 'COMMUNITY', text: 'Hospital fees. Pay ₹100.', action: { type: 'PAY', amount: 100 } },
    { id: 'cc12', type: 'COMMUNITY', text: 'School fees. Pay ₹50.', action: { type: 'PAY', amount: 50 } },
    { id: 'cc13', type: 'COMMUNITY', text: 'Receive ₹25 consultancy fee.', action: { type: 'COLLECT', amount: 25 } },
    { id: 'cc14', type: 'COMMUNITY', text: 'You are assessed for street repairs: ₹40 per house, ₹115 per hotel.', action: { type: 'REPAIRS', housePrice: 40, hotelPrice: 115 } },
    { id: 'cc15', type: 'COMMUNITY', text: 'You have won second prize in a beauty contest. Collect ₹10.', action: { type: 'COLLECT', amount: 10 } },
    { id: 'cc16', type: 'COMMUNITY', text: 'You inherit ₹100.', action: { type: 'COLLECT', amount: 100 } },
  ];
}

// Shuffle utility
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
