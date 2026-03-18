import { createPestMatchers } from '@heilgar/pest-core';
import { getActiveTestId } from './context.js';

export const pestMatchers = createPestMatchers(getActiveTestId);
