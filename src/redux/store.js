import { legacy_createStore as createStore } from 'redux';
// const thunk = require('redux-thunk');

const initialState = {
  queue: null,
  isPaused: false,
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_QUEUE':
      return {
        ...state,
        queue: action.payload,
      };
    case 'DESTROY_QUEUE':
      return {
        ...state,
        queue: null,
      }
    case 'TOGGLE_PAUSE':
      return {
        ...state,
        isPaused: !state.isPaused,
      }
    default:
      return state;
  }
}

const store = createStore(reducer);

export default store;