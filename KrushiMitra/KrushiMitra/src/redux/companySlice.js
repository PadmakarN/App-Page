import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  companyName: "",
  company: null,
  loading: false,
  error: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompany(state, action) {
      state.company = action.payload;
      state.companyName = action.payload?.companyName || "";
      state.error = null;
    },

    setCompanyLoading(state, action) {
      state.loading = action.payload;
    },

    setCompanyError(state, action) {
      state.error = action.payload;
    },

    clearCompany(state) {
      state.companyName = "";
      state.company = null;
      state.error = null;
      state.loading = false;
    },
  },
});

export const {
  setCompany,
  setCompanyLoading,
  setCompanyError,
  clearCompany,
} = companySlice.actions;

export default companySlice.reducer;