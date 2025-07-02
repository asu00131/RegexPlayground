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
  regex: z.string().describe('The regular expression to generate data for.'),
});
export type GenerateRegexDataInput = z.infer<typeof GenerateRegexDataInputSchema>;

const GenerateRegexDataOutputSchema = z.object({
  sampleData: z
    .string()
    .describe('A string of rich sample data for testing regular expressions, containing both matching and non-matching examples.'),
});
export type GenerateRegexDataOutput = z.infer<typeof GenerateRegexDataOutputSchema>;

export async function generateRegexData(input: GenerateRegexDataInput): Promise<GenerateRegexDataOutput> {
  return generateRegexDataFlow(input);
}

const generateRegexDataPrompt = ai.definePrompt({
  name: 'generateRegexDataPrompt',
  input: {schema: GenerateRegexDataInputSchema},
  output: {schema: GenerateRegexDataOutputSchema},
  prompt: `为下面的正则表达式生成两组测试数据: \`{{{regex}}}\`

请生成:
1.  一组可以被这个正则表达式匹配的字符串。
2.  一组与可匹配数据结构相似，但因为一些细微差别而无法匹配的字符串。

请将这两组数据混合在同一个文本块中返回，以便进行全面的测试。直接生成文本，不要包含额外的标题或解释。`,
  config: {
    temperature: 0.7,
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
