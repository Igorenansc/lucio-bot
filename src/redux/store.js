import { legacy_createStore as createStore } from 'redux';
// const thunk = require('redux-thunk');

const initialState = {
  playlist: [],
  currentTrack: null,
  isPlaying: false,
  connection: '',
  player: '',
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'ADD_TRACKS':
      return {
        ...state,
        playlist: [...state.playlist, ...action.payload],
      };
    case 'REMOVE_TRACK':
      return {
        ...state,
        playlist: state.playlist.filter((track) => track.id !== action.payload),
      };
    case 'PLAY_TRACK':
      return {
        ...state,
        currentTrack: state.playlist[0],
        isPlaying: true,
        playlist: state.playlist.slice(1),
      };
    case 'NEXT_TRACK':
      return {
        ...state,
        currentTrack: state.playlist[0],
        playlist: state.playlist.slice(1),
      };
    case 'STOP_PLAYLIST':
      return {
        ...state,
        playlist: [],
        currentTrack: null,
        isPlaying: false,
        connection: '',
        player: '',
      }
    case 'STOP_PLAYING':
      return {
        ...state,
        playlist: [],
        currentTrack: null,
        isPlaying: false,
      }
    case 'SET_CONNECTION':
      return {
        ...state,
        connection: action.payload.vc,
        player: action.payload.player,
      }
    default:
      return state;
  }
}

const store = createStore(reducer);

export default store;