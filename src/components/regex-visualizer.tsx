'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// This type must be kept in sync with the one in page.tsx
type RegexExplanationPart = {
  type: 'group' | 'literal' | 'char-class' | 'quantifier' | 'anchor' | 'unknown';
  token: string;
  description: string;
};

const typeStyles: Record<RegexExplanationPart['type'], string> = {
    literal: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    'char-class': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    quantifier: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30',
    anchor: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30',
    group: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30',
    unknown: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30',
};

const RegexVisualizer = ({ parts, regex }: { parts: RegexExplanationPart[]; regex: string }) => {
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
    <div className="overflow-x-auto p-4 bg-muted/50 rounded-lg">
      <div className="inline-flex items-center gap-2">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-background font-mono text-sm shadow-sm">
          Start
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        
        <div className="flex items-stretch gap-2">
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                <div
                  className={cn(
                    'flex flex-col justify-center rounded-md p-2 text-center shadow-sm',
                    typeStyles[part.type]
                  )}
                >
                  <p className="font-code font-bold">{part.token}</p>
                  <p className="max-w-28 truncate text-xs opacity-80">{part.description}</p>
                </div>
                {index < parts.length - 1 && (
                  <div className="flex items-center">
                    <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                )}
              </React.Fragment>
            ))}
        </div>

        <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-background font-mono text-sm shadow-sm">
          End
        </div>
      </div>
    </div>
  );
};

export default RegexVisualizer;
