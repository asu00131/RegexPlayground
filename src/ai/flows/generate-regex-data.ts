// src/ai/flows/generate-regex-data.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate sample data that conforms to a given regular expression.
 *
 * - generateRegexData - A function that generates sample data based on the provided regular expression.
 * - GenerateRegexDataInput - The input type for the generateRegexData function.
 * - GenerateRegexDataOutput - The return type for the generateRegexData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRegexDataInputSchema = z.object({
  regex: z
    .string()
    .describe('The regular expression to generate sample data from.'),
});
export type GenerateRegexDataInput = z.infer<typeof GenerateRegexDataInputSchema>;

const GenerateRegexDataOutputSchema = z.object({
  sampleData: z
    .string()
    .describe('A string of sample data that conforms to the provided regular expression.'),
});
export type GenerateRegexDataOutput = z.infer<typeof GenerateRegexDataOutputSchema>;

export async function generateRegexData(input: GenerateRegexDataInput): Promise<GenerateRegexDataOutput> {
  return generateRegexDataFlow(input);
}

const generateRegexDataPrompt = ai.definePrompt({
  name: 'generateRegexDataPrompt',
  input: {schema: GenerateRegexDataInputSchema},
  output: {schema: GenerateRegexDataOutputSchema},
  prompt: `You are a regular expression expert. Please generate a string of sample data that conforms to the following regular expression:\n\n{{regex}}\n\nEnsure that the generated data is valid according to the regex. Do not provide any explanations, just the generated sample data. For each request, provide a different, unique, and random result.`,
  config: {
    temperature: 1.0,
  },
});

const generateRegexDataFlow = ai.defineFlow(
  {
    name: 'generateRegexDataFlow',
    inputSchema: GenerateRegexDataInputSchema,
    outputSchema: GenerateRegexDataOutputSchema,
  },
  async input => {
    const {output} = await generateRegexDataPrompt(input);
    return output!;
  }
);
