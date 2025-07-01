'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';

// This type must be kept in sync with the one in page.tsx
type RegexExplanationPart = {
  type: 'group' | 'literal' | 'char-class' | 'quantifier' | 'anchor' | 'unknown';
  token: string;
  description: string;
};

type ProcessedNode = {
  id: string;
  part: RegexExplanationPart;
  quantifier?: RegexExplanationPart;
};

const typeStyles: Record<RegexExplanationPart['type'], string> = {
  literal: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-300 dark:border-sky-700',
  'char-class': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  quantifier: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300', // Not used directly on box
  anchor: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 border-violet-300 dark:border-violet-700',
  group: 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  unknown: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300 dark:border-rose-700',
};

const Node = ({ node }: { node: ProcessedNode }) => (
  <div className="relative flex items-center">
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative py-6 px-2">
            <div className={cn(
              'z-10 relative px-4 py-2 border rounded-lg shadow-sm font-code font-semibold text-center min-w-[60px]',
              typeStyles[node.part.type]
            )}>
              {node.part.token}
            </div>

            {node.quantifier && (
              <>
                {/* Loop path */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[calc(100%-1rem)] h-6 border-t-2 border-x-2 border-gray-400 rounded-t-md" />
                <div className="absolute right-4 top-0">
                  <ArrowRight className="h-4 w-4 text-gray-400 -rotate-90" />
                </div>
                 {/* Quantifier description */}
                 <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background px-1 z-20">
                    {node.quantifier.description}
                 </div>
              </>
            )}
            
            {/* Main track */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{node.part.token}</p>
          <p>{node.part.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);


const RegexVisualizer = ({ parts, regex }: { parts: RegexExplanationPart[]; regex: string }) => {
  const [scale, setScale] = useState(100);

  const processedNodes = useMemo(() => {
    const nodes: ProcessedNode[] = [];
    if (!parts) return [];
    let i = 0;
    while (i < parts.length) {
      const current = parts[i];
      const next = i + 1 < parts.length ? parts[i + 1] : null;

      if (
        next?.type === 'quantifier' &&
        current.type !== 'anchor' &&
        current.type !== 'quantifier'
      ) {
        nodes.push({ id: `node-${i}`, part: current, quantifier: next });
        i += 2;
      } else {
        nodes.push({ id: `node-${i}`, part: current });
        i += 1;
      }
    }
    return nodes;
  }, [parts]);


  if (!regex) {
    return (
      <div className="flex h-full min-h-32 items-center justify-center rounded-lg bg-muted/50 p-4">
        <p className="text-center text-muted-foreground">
          请输入一个正则表达式以查看其可视化。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto p-4 bg-muted/50 rounded-lg">
        <div 
          className="inline-flex items-center transition-transform duration-200"
          style={{ transform: `scale(${scale / 100})`, transformOrigin: 'left center' }}
        >
          <div className="flex items-center text-sm font-semibold">
            <div className="px-4 py-2 rounded-full border-2 border-dashed">Start</div>
            <div className="w-8 h-0.5 bg-gray-400" />
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          </div>

          <div className="flex items-start">
            {processedNodes.map((node, index) => (
              <React.Fragment key={node.id}>
                <Node node={node} />
                {index < processedNodes.length - 1 && 
                  <div className="flex items-center self-center">
                    <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                }
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center text-sm font-semibold">
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
             <div className="w-8 h-0.5 bg-gray-400" />
            <div className="px-4 py-2 rounded-full border-2 border-dashed">End</div>
          </div>
        </div>
      </div>
       <div className="flex items-center gap-4 mt-4 p-2 rounded-lg bg-muted/50">
          <Label htmlFor="zoom-slider" className="text-sm font-medium">放大</Label>
          <Slider
            id="zoom-slider"
            min={50}
            max={150}
            step={10}
            value={[scale]}
            onValueChange={(value) => setScale(value[0])}
            className="w-48"
          />
        </div>
    </div>
  );
};

export default RegexVisualizer;
