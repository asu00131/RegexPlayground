import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Use a proxy to ensure access from different regions, especially when deployed on Vercel.
      apiEndpoint: '00131.eu.org/proxy',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
