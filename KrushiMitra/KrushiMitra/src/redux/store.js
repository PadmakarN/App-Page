import { configureStore } from "@reduxjs/toolkit";
import companyReducer from "./companySlice";

export const store = configureStore({
  reducer: {
    company: companyReducer,
  },
});