import { configureStore, combineReducers } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { persistStore, persistReducer } from "redux-persist";
import { Root } from "./Redux/Root";

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },
  setItem(_key, value) {
    return Promise.resolve(value);
  },
  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== "undefined"
    ? require("redux-persist/lib/storage").default
    : createNoopStorage();

const persistConfig = {
  key: "root",   
  storage,        
  blacklist: ['show_search', 'show_search_reducer','admin_search_bar_reducer','search_bar_reducer','chat_reducer'],
};

const persistedReducer = persistReducer(persistConfig, Root);

const Store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: true,  
      serializableCheck: false,  
    }),
});

const persistor = persistStore(Store);  

export { Store, persistor };
