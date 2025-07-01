'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Skeleton } from './ui/skeleton';

const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/regulex-cjs@0.5.1/regulex.js';

const RegexVisualizer = ({ regex, flags }: { regex: string; flags: string }) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    if ((window as any).regulex) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;

    const handleLoad = () => {
      setScriptLoaded(true);
    };

    const handleError = () => {
      console.error('Failed to load regex visualizer script.');
      setScriptError(true);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      // It's safer to not remove the script to avoid issues if other components are using it.
      // If this component were to unmount and remount quickly.
    };
  }, []);

  const { svg, error } = useMemo(() => {
    if (!scriptLoaded || !regex) {
      return { svg: null, error: null };
    }
    
    if (!(window as any).regulex) {
        return { svg: null, error: '可视化库加载失败。'};
    }

    try {
      const ast = (window as any).regulex.parse(regex);
      const generatedSvg = (window as any).regulex.visualize(ast);

      const themeAwareSvg = generatedSvg
        .replace(/fill="#000000"/g, 'fill="currentColor"')
        .replace(/stroke="#000000"/g, 'stroke="currentColor"');
        
      return { svg: themeAwareSvg, error: null };
    } catch (e: any) {
      console.error('Regex visualization error:', e);
      return { svg: null, error: `无法为此正则表达式生成可视化。它可能包含无效或不支持的语法。` };
    }
  }, [regex, scriptLoaded]);

  if (scriptError) {
      return <div className="p-4 text-center text-destructive">无法加载可视化脚本。</div>;
  }
  
  if (!scriptLoaded) {
      return (
          <div className="space-y-2 p-4">
              <p className="text-sm text-muted-foreground">正在加载可视化工具...</p>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
      )
  }

  if (error) {
    return <div className="p-4 text-center text-destructive">{error}</div>;
  }
  
  if (!regex) {
      return (
         <div className="p-4 text-center text-muted-foreground">
          请输入一个正则表达式以查看其可视化。
        </div>
      )
  }

  return (
    <>
      <div className="p-4 border-b font-code text-sm break-all">
        <span className="font-semibold">RegExp: </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-primary">{regex}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-accent">{flags}</span>
      </div>
      <div
        className="p-4 overflow-x-auto text-foreground [&_svg]:mx-auto"
        dangerouslySetInnerHTML={{ __html: svg || '' }}
      />
    </>
  );
};

export default RegexVisualizer;
