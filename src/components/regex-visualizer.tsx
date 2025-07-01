'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// A simple, hand-rolled parser for demonstration purposes.
// It's not a full regex engine, but it handles common structures for visualization.

type AstNode = 
  | { type: 'sequence', parts: AstNode[] }
  | { type: 'choice', options: AstNode[] }
  | { type: 'quantifier', kind: string, greedy: boolean, content: AstNode }
  | { type: 'group', capturing: boolean, index?: number, content: AstNode }
  | { type: 'char-class', raw: string, description: string }
  | { type: 'anchor', raw: string, description: string }
  | { type: 'literal', value: string };

  
const tokenDescriptions: Record<string, { type: 'char-class' | 'anchor', description: string }> = {
    '\\d': { type: 'char-class', description: '匹配任何数字 (0-9)。' },
    '\\w': { type: 'char-class', description: '匹配任何单词字符（字母数字和下划线）。' },
    '\\s': { type: 'char-class', description: '匹配任何空白字符。' },
    '\\D': { type: 'char-class', description: '匹配任何非数字字符。' },
    '\\W': { type: 'char-class', description: '匹配任何非单词字符。' },
    '\\S': { type: 'char-class', description: '匹配任何非空白字符。' },
    '.': { type: 'char-class', description: '匹配除换行符以外的任何字符。' },
    '^': { type: 'anchor', description: '匹配字符串的开头。' },
    '$': { type: 'anchor', description: '匹配字符串的结尾。' },
    '\\b': { type: 'anchor', description: '匹配单词边界。' },
    '\\B': { type: 'anchor', description: '匹配非单词边界。' },
};


function parse(regex: string): { ast: AstNode | null, error: string | null } {
    if (!regex) return { ast: null, error: '请输入正则表达式' };
    try {
        new RegExp(regex);
    } catch (e: any) {
        return { ast: null, error: e.message };
    }

    const tokens = regex.match(/\\.|[+*?](?:\?)?|\{\d+,?\d*\}|\(\?[:=!]|\(|\)|\||\[.*?\]|[^\\()\[\]+*?{}^$|]+/g) || [];
    let position = 0;
    let groupIndex = 1;

    function parseSequence(): AstNode {
        const parts: AstNode[] = [];
        while (position < tokens.length && tokens[position] !== ')' && tokens[position] !== '|') {
            parts.push(parseToken());
        }
        return parts.length === 1 ? parts[0] : { type: 'sequence', parts };
    }

    function parseToken(): AstNode {
        let node = parsePrimary();
        const nextToken = tokens[position];

        if (nextToken && ['*', '+', '?'].includes(nextToken[0])) {
            position++;
            const greedy = nextToken.length === 1 || nextToken[1] !== '?';
            node = { type: 'quantifier', kind: nextToken[0], greedy, content: node };
        }
        return node;
    }

    function parsePrimary(): AstNode {
        const token = tokens[position++];
        
        if (token.startsWith('(')) {
            const capturing = !token.startsWith('(?:');
            let content;

            const options = [];
            options.push(parseSequence());

            while (position < tokens.length && tokens[position] === '|') {
                position++; // Consume '|'
                options.push(parseSequence());
            }
            
            if (options.length > 1) {
                content = { type: 'choice', options };
            } else {
                content = options[0];
            }

            if (position >= tokens.length || tokens[position] !== ')') {
                 throw new Error("括号不匹配");
            }
            position++; // Consume ')'
            return { type: 'group', capturing, index: capturing ? groupIndex++ : undefined, content };
        }

        const description = tokenDescriptions[token];
        if (description) {
            return { type: description.type, raw: token, description: description.description };
        }

        if (token.startsWith('[') && token.endsWith(']')) {
            return { type: 'char-class', raw: token, description: '字符集。匹配其中任意一个字符。' };
        }

        return { type: 'literal', value: token };
    }
    
    try {
      const options = [];
      options.push(parseSequence());
      while (position < tokens.length && tokens[position] === '|') {
          position++; // Consume '|'
          options.push(parseSequence());
      }

      if (position < tokens.length) {
          return { ast: null, error: `存在意外的标记: ${tokens[position]}` };
      }
      
      const ast = options.length === 1 ? options[0] : { type: 'choice', options };
      return { ast, error: null };

    } catch (e: any) {
        return { ast: null, error: e.message };
    }
}

const NodeComponent = ({ node }: { node: AstNode }) => {
  switch (node.type) {
    case 'sequence': return <Sequence parts={node.parts} />;
    case 'choice': return <Choice options={node.options} />;
    case 'quantifier': return <Quantifier node={node} />;
    case 'group': return <Group node={node} />;
    case 'char-class': return <Terminal text={node.raw} description={node.description} className="bg-emerald-100 text-emerald-800" />;
    case 'anchor': return <Terminal text={node.raw} description={node.description} className="bg-violet-100 text-violet-800" />;
    case 'literal': return <Terminal text={node.value} description={`匹配字面量: "${node.value}"`} className="bg-sky-100 text-sky-800" />;
    default: return null;
  }
};

const Sequence = ({ parts }: { parts: AstNode[] }) => (
  <div className="flex items-center">
    {parts.map((part, index) => (
      <React.Fragment key={index}>
        <NodeComponent node={part} />
        {index < parts.length - 1 && <div className="w-6 h-0.5 bg-gray-400" />}
      </React.Fragment>
    ))}
  </div>
);

const Choice = ({ options }: { options: AstNode[] }) => (
  <div className="flex items-center">
    <div className="w-6 h-0.5 bg-gray-400" />
    <div className="flex flex-col">
      {options.map((option, index) => (
        <div key={index} className="flex items-center relative py-2 first:pt-0 last:pb-0">
          <div className="absolute left-0 w-3 h-full border-gray-400 border-y-2 first:border-t-0 last:border-b-0" />
          <div className={cn("absolute left-0 w-3 h-0.5 bg-gray-400", options.length > 1 ? "border-l-2 border-gray-400 rounded-l-md" : "")} />
          <div className="mx-2"><NodeComponent node={option} /></div>
          <div className="absolute right-0 w-3 h-0.5 bg-gray-400 border-r-2 border-gray-400 rounded-r-md" />
        </div>
      ))}
    </div>
    <div className="w-6 h-0.5 bg-gray-400" />
  </div>
);

const Quantifier = ({ node }: { node: AstNode & { type: 'quantifier' } }) => {
  let text = '';
  switch(node.kind) {
      case '*': text = '0 或更多次'; break;
      case '+': text = '1 或更多次'; break;
      case '?': text = '0 或 1 次'; break;
  }
  if (!node.greedy) text += ' (非贪婪)';

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center w-full">
        <div className="w-6 h-0.5 bg-gray-400" />
        <div className="flex-grow pt-4">
          <div className="text-center text-xs text-muted-foreground -mt-3">{text}</div>
          <div className="border-t-2 border-dashed border-gray-400" />
        </div>
        <div className="w-6 h-0.5 bg-gray-400" />
      </div>
      <div className="flex items-center w-full">
         <div className="h-4 w-6 border-l-2 border-b-2 border-dashed border-gray-400 rounded-bl-md"></div>
         <NodeComponent node={node.content} />
         <div className="h-4 w-6 border-r-2 border-b-2 border-dashed border-gray-400 rounded-br-md"></div>
      </div>
    </div>
  );
};

const Group = ({ node }: { node: AstNode & { type: 'group' } }) => {
  let text = node.capturing ? `分组 #${node.index}` : '非捕获分组';
  return (
    <div className="p-2 border border-gray-400 rounded-lg bg-gray-50">
      <div className="text-xs text-center text-muted-foreground -mt-1 mb-1">{text}</div>
      <NodeComponent node={node.content} />
    </div>
  );
};

const Terminal = ({ text, description, className }: { text: string; description: string; className?: string }) => (
  <div title={description} className={cn("px-4 py-2 border border-gray-400 rounded-lg font-code text-center min-w-[40px] shadow-sm", className)}>
    {text}
  </div>
);

const RegexVisualizer = ({ regex }: { regex: string }) => {
  const { ast, error } = useMemo(() => parse(regex), [regex]);
  const [zoom, setZoom] = useState(100);

  if (error) {
    return (
      <div className="flex h-full min-h-32 items-center justify-center rounded-lg bg-muted/50 p-4">
        <p className="text-center text-muted-foreground">{error}</p>
      </div>
    );
  }
  
  if (!ast) {
     return (
      <div className="flex h-full min-h-32 items-center justify-center rounded-lg bg-muted/50 p-4">
        <p className="text-center text-muted-foreground">输入一个正则表达式以查看其可视化。</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto p-4 bg-muted/50 rounded-lg" style={{ transform: `scale(${zoom/100})`, transformOrigin: 'top left' }}>
        <div className="inline-flex items-center">
          <Terminal text="开始" description="正则表达式的开始" className="bg-gray-200" />
          <div className="w-6 h-0.5 bg-gray-400" />
          <NodeComponent node={ast} />
          <div className="w-6 h-0.5 bg-gray-400" />
          <Terminal text="结束" description="正则表达式的结束" className="bg-gray-200" />
        </div>
      </div>
       <div className="flex items-center gap-4 mt-4 p-2 rounded-lg bg-muted/50">
          <Label htmlFor="zoom-slider" className="text-sm font-medium">放大</Label>
          <Slider
            id="zoom-slider"
            min={50}
            max={150}
            step={10}
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            className="w-48"
          />
      </div>
    </div>
  );
};

export default RegexVisualizer;
