import { SLICES } from '../storeConfig';
import { HomeSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<HomeSlice>(SLICES.HOME);
const setState = setStateBuilder<HomeSlice>(SLICES.HOME);
