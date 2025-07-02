
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
  | { type: 'group', capturing: boolean, index?: number, content: AstNode, label?: string }
  | { type: 'char-class', raw: string, description: string, label: string, content?: string }
  | { type: 'control-char', raw: string, description: string, label: string }
  | { type: 'anchor', raw: string, description: string, label: string }
  | { type: 'literal', value: string, raw: string, description: string, label: string }
  | { type: 'backreference', raw: string, groupIndex: number, label: string, description: string };

const tokenInfo: Record<string, { type: 'char-class' | 'anchor' | 'control-char', description: string, label: string }> = {
    '\\d': { type: 'char-class', description: '匹配任何数字 (0-9)。', label: '数字' },
    '\\D': { type: 'char-class', description: '匹配任何非数字字符。', label: '非数字' },
    '\\w': { type: 'char-class', description: '匹配任何单词字符（字母数字和下划线）。', label: '单词字符' },
    '\\W': { type: 'char-class', description: '匹配任何非单词字符。', label: '非单词字符' },
    '\\s': { type: 'char-class', description: '匹配任何空白字符。', label: '空白' },
    '\\S': { type: 'char-class', description: '匹配任何非空白字符。', label: '非空白' },
    '.': { type: 'char-class', description: '匹配除换行符以外的任何字符。', label: '任意字符' },
    '^': { type: 'anchor', description: '匹配字符串的开头。', label: '开头' },
    '$': { type: 'anchor', description: '匹配字符串的结尾。', label: '结尾' },
    '\\b': { type: 'anchor', description: '匹配单词边界。', label: '词边界' },
    '\\B': { type: 'anchor', description: '匹配非单词边界。', label: '非词边界' },
    '\\n': { type: 'control-char', description: '匹配换行符。', label: '换行' },
    '\\r': { type: 'control-char', description: '匹配回车符。', label: '回车' },
    '\\t': { type: 'control-char', description: '匹配制表符。', label: '制表符' },
    '\\f': { type: 'control-char', description: '匹配换页符。', label: '换页' },
    '\\v': { type: 'control-char', description: '匹配垂直制表符。', label: '垂直制表符' },
};


function parse(regex: string): { ast: AstNode | null, error: string | null } {
    if (!regex) return { ast: null, error: '请输入正则表达式' };
    try {
        new RegExp(regex);
    } catch (e: any) {
        return { ast: null, error: e.message };
    }

    const tokens = regex.match(/\\[1-9]\d*|\\.|[+*?](?:\?)?|\{\d+,?\d*\}|\[\^?.*?\]|\(\?[:=!<]|\(|\)|\||\^|\$|\.|[^\\()\[\].+*?{}^$|]+/g) || [];
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
        } else if (nextToken && nextToken.startsWith('{')) {
            position++;
            node = { type: 'quantifier', kind: nextToken, greedy: true, content: node };
        }
        return node;
    }

    function parsePrimary(): AstNode {
        const token = tokens[position++];
        
        if (token.startsWith('\\') && /^[1-9]\d*$/.test(token.substring(1))) {
            const groupNum = parseInt(token.substring(1));
            return { type: 'backreference', raw: token, groupIndex: groupNum, label: `引用 #${groupNum}`, description: `匹配对第 ${groupNum} 个捕获分组的引用。` };
        }

        if (token && token.startsWith('(')) {
            let capturing = false;
            let label = '';
            
            if (token === '(') {
              capturing = true;
              label = `捕获分组 #${groupIndex}`;
            } else if (token === '(?:') {
              label = '非捕获分组';
            } else if (token === '(?=') {
              label = '正向先行断言';
            } else if (token === '(?!') {
              label = '负向先行断言';
            } else if (token === '(?<=') {
              label = '正向后行断言';
            } else if (token === '(?<!') {
              label = '负向后行断言';
            }


            const options = [];
            options.push(parseSequence());

            while (position < tokens.length && tokens[position] === '|') {
                position++; // Consume '|'
                options.push(parseSequence());
            }
            
            let content: AstNode;
            if (options.length > 1) {
                content = { type: 'choice', options };
            } else {
                content = options[0];
            }

            if (position >= tokens.length || tokens[position] !== ')') {
                 throw new Error("括号不匹配");
            }
            position++; // Consume ')'
            return { type: 'group', capturing, index: capturing ? groupIndex++ : undefined, content, label };
        }

        const info = tokenInfo[token];
        if (info) {
            return { type: info.type, raw: token, description: info.description, label: info.label };
        }

        if (token && token.startsWith('[') && token.endsWith(']')) {
            // HACK: Handle common inverted classes explicitly for better visualization
            if (token === '[^\\n]') {
                return { type: 'char-class', raw: token, description: '匹配除换行符以外的任何字符。', label: '非换行符' };
            }
            if (token === '[^\\r\\n]') {
                return { type: 'char-class', raw: token, description: '匹配除换行或回车以外的任何字符。', label: '非换行/回车' };
            }

            const inverted = token.startsWith('[^');
            const content = token.substring(inverted ? 2 : 1, token.length - 1);
            let description = '';
            let label = '';

            const commonRanges: Record<string, {label: string, desc: string}> = {
                'a-z': {label: '小写字母', desc: '匹配任意小写字母 a 到 z。'},
                'A-Z': {label: '大写字母', desc: '匹配任意大写字母 A 到 Z。'},
                '0-9': {label: '数字', desc: '匹配任意数字 0 到 9。'},
                'a-zA-Z0-9_': {label: '单词字符', desc: '匹配任何单词字符（字母数字和下划线）。'},
                '\\w\\W': {label: '任意字符', desc: '匹配任意字符，包括换行符。'},
                '\\w': {label: '单词字符', desc: '匹配任何单词字符（字母数字和下划线）。'},
                '\\W': {label: '非单词字符', desc: '匹配任何非单词字符。'},
                '\\d': {label: '数字', desc: '匹配任何数字 (0-9)。'},
                '\\D': {label: '非数字', desc: '匹配任何非数字字符。'},
                '\\s': {label: '空白', desc: '匹配任何空白字符。'},
                '\\S': {label: '非空白', desc: '匹配任何非空白字符。'},
                '\\W_': {label: '特殊字符', desc: '匹配一个非单词字符或下划线 (等同于非字母数字)。'},
            }
            if(commonRanges[content]) {
                label = commonRanges[content].label;
                description = commonRanges[content].desc;
                return { type: 'char-class', raw: token, description, label: (inverted ? '非: ' : '') + label };
            } else {
                 label = '字符集';
                 description = inverted 
                     ? `匹配除 "${content}" 以外的任意字符。` 
                     : `匹配 "${content}" 中的任意一个字符。`;
                return { type: 'char-class', raw: token, description, label: (inverted ? '非: ' : '') + label, content };
            }
        }
        
        if (token.startsWith('\\') && token.length > 1) {
            const char = token.substring(1);
            return { type: 'literal', value: char, raw: token, label: char, description: `匹配字面量字符: "${char}"` };
        }

        return { type: 'literal', value: token, raw: token, label: token, description: `匹配字面量字符: "${token}"` };
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
    case 'char-class': 
    case 'control-char':
    case 'anchor':
    case 'literal':
    case 'backreference':
      return <Terminal node={node} />;
    default: return null;
  }
};

const Path = ({className}: {className?: string}) => <div className={cn("w-6 h-0.5 bg-destructive", className)} />;

const Sequence = ({ parts }: { parts: AstNode[] }) => (
  <div className="flex items-center">
    {parts.map((part, index) => (
      <React.Fragment key={index}>
        <NodeComponent node={part} />
        {index < parts.length - 1 && <Path />}
      </React.Fragment>
    ))}
  </div>
);

const Choice = ({ options }: { options: AstNode[] }) => (
  <div className="inline-flex flex-col items-center">
    {/* Entry branch point */}
    <div className="w-0.5 h-2 bg-destructive" />

    <div className="flex flex-col border-x-2 border-destructive rounded-lg">
      {options.map((option, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center px-4 py-2">
            <Path />
            <NodeComponent node={option} />
            <Path />
          </div>
          {index < options.length - 1 && (
             <div className="h-0.5 w-full bg-destructive relative">
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground">或</span>
             </div>
          )}
        </React.Fragment>
      ))}
    </div>
    
    {/* Exit branch point */}
    <div className="w-0.5 h-2 bg-destructive" />
  </div>
);

const Quantifier = ({ node }: { node: AstNode & { type: 'quantifier' } }) => {
  let text = '';
  switch(node.kind) {
      case '*': text = '0 或更多次'; break;
      case '+': text = '1 或 更多次'; break;
      case '?': text = '0 或 1 次'; break;
      default:
        if (node.kind.startsWith('{')) {
            const range = node.kind.slice(1, -1);
            const [min, max] = range.split(',');

            if (max === undefined) { // {n}
                text = `重复 ${min} 次`;
            } else if (max === '') { // {n,}
                text = `重复 ${min} 次或更多`;
            } else { // {n,m}
                text = `重复 ${min} 到 ${max} 次`;
            }
        }
        break;
  }
  if (!node.greedy) text += ' (非贪婪)';
  
  const hasBypass = node.kind === '?' || node.kind === '*';
  const hasLoop = node.kind === '+' || node.kind === '*';

  return (
    <div className="inline-flex flex-col items-center mx-2">
      <div className="relative pt-6 pb-6">
        <NodeComponent node={node.content} />
        {hasBypass && (
          <div className="absolute top-0 left-0 right-0 h-4" aria-hidden="true">
            <div className="w-full h-full border-t-2 border-x-2 border-destructive rounded-t-md" />
          </div>
        )}
        {hasLoop && (
          <div className="absolute bottom-0 left-0 right-0 h-4" aria-hidden="true">
            <div className={cn("w-full h-full border-b-2 border-x-2 border-destructive rounded-b-md flex items-center", !node.greedy && "border-dashed")}>
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-r-[5px] border-r-destructive border-b-[4px] border-b-transparent ml-2"></div>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-medium">{text}</p>
    </div>
  );
};


const Group = ({ node }: { node: AstNode & { type: 'group' } }) => {
  const text = node.label || (node.capturing ? `分组 #${node.index}` : '非捕获分组');
  return (
    <div className="p-4 border-2 border-dashed border-gray-400 rounded-lg bg-muted/30 relative mx-2">
      <div className="absolute -top-3 left-2 text-xs text-center text-muted-foreground bg-background px-1">{text}</div>
      <NodeComponent node={node.content} />
    </div>
  );
};

const NodeBox = ({ label, content, description, className }: { label: string; content?: string; description: string; className?: string }) => (
    <div title={description} className={cn("px-3 py-1.5 border-2 rounded-md text-center shadow-sm min-w-[50px] bg-card", className)}>
        <div className="font-semibold text-card-foreground">{label}</div>
        {content && <div className="text-xs text-muted-foreground font-code mt-0.5">{content}</div>}
    </div>
);

const Terminal = ({ node }: { node: AstNode & { type: 'literal' | 'char-class' | 'anchor' | 'backreference' | 'control-char' } }) => {
    let className = '';
    if (node.type === 'char-class') className = 'border-emerald-400';
    if (node.type === 'anchor') className = 'border-violet-400';
    if (node.type === 'control-char') className = 'border-fuchsia-400';
    if (node.type === 'literal') className = 'border-sky-400';
    if (node.type === 'backreference') className = 'border-orange-400';

    const content = (node.type === 'char-class' && node.content) ? node.content : undefined;

    return <NodeBox label={node.label} content={content} description={node.description} className={className} />;
};

const StartNode = () => (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white font-bold border-2 border-green-700 shadow-md">
        开始
    </div>
);

const EndNode = () => (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-700 text-white font-bold border-2 border-slate-900 shadow-md">
        结束
    </div>
);


const RegexVisualizer = ({ regex }: { regex: string }) => {
  const { ast, error } = useMemo(() => parse(regex), [regex]);
  const [zoom, setZoom] = useState(100);

  if (error) {
    return (
      <div className="flex h-full min-h-32 items-center justify-center rounded-lg bg-muted/50 p-4">
        <p className="text-center text-destructive">{error}</p>
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
      <div className="overflow-x-auto p-8 bg-muted/50 rounded-lg">
        <div 
          className="inline-block" 
          style={{ transform: `scale(${zoom/100})`, transformOrigin: 'center left' }}
        >
            <div className="inline-flex items-center p-4">
              <StartNode />
              <Path />
              <NodeComponent node={ast} />
              <Path />
              <EndNode />
            </div>
        </div>
      </div>
       <div className="flex items-center justify-center gap-4 mt-4 p-2 rounded-lg bg-muted/50">
          <Label htmlFor="zoom-slider" className="text-sm font-medium">缩放</Label>
          <Slider
            id="zoom-slider"
            min={25}
            max={150}
            step={5}
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            className="w-48"
          />
          <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
      </div>
    </div>
  );
};

export default RegexVisualizer;
