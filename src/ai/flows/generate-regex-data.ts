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

const GenerateRegexDataInputSchema = z.object({});
export type GenerateRegexDataInput = z.infer<typeof GenerateRegexDataInputSchema>;

const GenerateRegexDataOutputSchema = z.object({
  sampleData: z
    .string()
    .describe('A string of rich sample data for testing regular expressions.'),
});
export type GenerateRegexDataOutput = z.infer<typeof GenerateRegexDataOutputSchema>;

export async function generateRegexData(input: GenerateRegexDataInput): Promise<GenerateRegexDataOutput> {
  return generateRegexDataFlow(input);
}

const generateRegexDataPrompt = ai.definePrompt({
  name: 'generateRegexDataPrompt',
  input: {schema: GenerateRegexDataInputSchema},
  output: {schema: GenerateRegexDataOutputSchema},
  prompt: `生成一组用于正则表达式测试的丰富文本数据。请确保数据中包含以下各类示例，以便于全面测试：

- 合法与非法的邮箱地址 (例如: test@example.com, invalid-email, user@domain)
- HTML 标签 (例如: \`<div><p class="greeting">Hello</p></div>\`, \`空标签 <br/>\`)
- 中国大陆手机号 (例如: 13812345678, 1234567)
- 重复的单词 (例如: "this is is a test")
- 引号包裹的文本 (例如: '单引号' and "双引号")
- 多种日期格式 (例如: 2023-12-25, 25/12/2023)
- 包含特殊字符的密码 (例如: Abc!123, P@ssw0rd_)
- Unicode 字符 (例如: 你好世界, 🚀)
- 多行日志条目 (例如: \`[INFO] User logged in.\`, \`[ERROR] Failed to connect to DB.\`)

请直接生成这些混合在一起的文本数据，不要添加任何额外的标题或解释。`,
  config: {
    temperature: 0.8,
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
