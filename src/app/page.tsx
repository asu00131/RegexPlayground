'use client';

import React, { useState, useMemo, useCallback, useEffect, Fragment, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateRegexData } from '@/ai/flows/generate-regex-data';
import {
  ClipboardCopy,
  Sparkles,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import RegexVisualizer from '@/components/regex-visualizer';

const CheatSheet = () => (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="char-classes">
      <AccordionTrigger>字符类</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">.</code> - 任何字符 (换行符除外)</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\d</code> - 任何数字</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\D</code> - 任何非数字字符</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\w</code> - 任何单词字符 (a-z, A-Z, 0-9, _)</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\W</code> - 任何非单词字符</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\s</code> - 任何空白字符</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\S</code> - 任何非空白字符</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="anchors">
      <AccordionTrigger>锚点</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">^</code> - 字符串开头</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">$</code> - 字符串结尾</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\b</code> - 单词边界</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\B</code> - 非单词边界</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="quantifiers">
      <AccordionTrigger>量词</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">*</code> - 0个或多个</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">+</code> - 1个或多个</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">?</code> - 0个或1个</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n}`}</code> - 正好n次</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n,}`}</code> - n次或更多次</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n,m}`}</code> - n到m次之间</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="groups">
      <AccordionTrigger>分组和范围</AccordionTrigger>
      <AccordionContent>
         <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">(...)</code> - 捕获分组</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">(?:...)</code> - 非捕获分组</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[abc]</code> - 匹配 a, b, 或 c</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[^abc]</code> - 匹配除 a, b, c 之外的任何字符</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[a-z]</code> - 匹配从 a 到 z 的任何字符</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default function RegexPlaygroundPage() {
  const { toast } = useToast();
  const [regex, setRegex] = useState('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|<([a-z]+)>.*?<\\/\\1>|1[3-9]\\d{9}');
  const [testString, setTestString] = useState('My email is example@domain.com, but not fake@domain.\nThis is a <b>bold</b> tag and this is a <i>italic</i> one.\nPhone numbers: 13912345678, 18687654321.\nInvalid phone: 12011112222.');
  const [replacementString, setReplacementString] = useState('【前】$2【-中间-】$1【后】');
  
  const [globalSearch, setGlobalSearch] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [multiline, setMultiline] = useState(true);
  
  const [regexError, setRegexError] = useState<string | null>(null);
  const [isInsertingSample, setIsInsertingSample] = useState(false);

  const scrollSyncRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      new RegExp(regex);
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
    }
  }, [regex]);

  const handleCopy = useCallback((text: string, subject: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${subject}已复制！`,
      description: '文本已复制到您的剪贴板。',
    });
  }, [toast]);

  const { matches, replacementResult } = useMemo(() => {
    if (regexError) {
      return { matches: [], replacementResult: '无效的正则表达式' };
    }
    try {
      const flags = `${globalSearch ? 'g' : ''}${ignoreCase ? 'i' : ''}${multiline ? 'm' : ''}`;
      const re = new RegExp(regex, flags);
      
      const currentMatches = globalSearch ? [...testString.matchAll(re)] : (testString.match(re) ? [testString.match(re)!] : []);
      const currentReplacementResult = testString.replace(re, replacementString);

      return { matches: currentMatches, replacementResult: currentReplacementResult };
    } catch (e) {
      // 此情况应由useEffect覆盖，但作为备用方案：
      return { matches: [], replacementResult: '无效的正则表达式' };
    }
  }, [regex, testString, replacementString, globalSearch, ignoreCase, multiline, regexError]);

  const handleCopyAllMatches = useCallback(() => {
    if (matches.length === 0) return;
    const allMatchesText = matches.map(match => match[0]).join('\n');
    handleCopy(allMatchesText, '所有匹配结果');
  }, [matches, handleCopy]);

  const handleCopyAllGroups = useCallback((match: RegExpMatchArray, matchIndex: number) => {
    if (match.length <= 1) return;
    const allGroupsText = [...match].slice(1).map(g => g ?? '').join('\n');
    handleCopy(allGroupsText, `匹配 ${matchIndex + 1} 的所有分组`);
  }, [handleCopy]);

  const handleGenerateAndInsertData = useCallback(async () => {
    if (!regex || regexError) {
      toast({
        variant: 'destructive',
        title: '无效的正则表达式',
        description: '请输入有效的正则表达式后再生成数据。',
      });
      return;
    }
    setIsInsertingSample(true);
    try {
      const result = await generateRegexData({ regex });
      setTestString((prevTestString) =>
        prevTestString ? `${result.sampleData}\n${prevTestString}` : result.sampleData
      );
      toast({
        title: '数据已插入',
        description: '生成的示例数据已添加到测试字符串的开头。',
      });
    } catch (error) {
      console.error('生成数据时出错:', error);
      toast({
        variant: 'destructive',
        title: '生成失败',
        description: '无法为此正则表达式生成数据。',
      });
    } finally {
      setIsInsertingSample(false);
    }
  }, [regex, regexError, toast]);

  const highlightedTestString = useMemo(() => {
    if (regexError || !testString || matches.length === 0) {
      const lines = (testString || '').split('\n');
      return lines.map((line, i) => <div key={i}>{line || '\u00A0'}</div>);
    }

    const segments: { type: 'text' | 'mark'; content: string }[] = [];
    let lastIndex = 0;
    matches.forEach((match) => {
      const startIndex = match.index!;
      const matchText = match[0];
      if (startIndex > lastIndex) {
        segments.push({ type: 'text', content: testString.substring(lastIndex, startIndex) });
      }
      segments.push({ type: 'mark', content: matchText });
      lastIndex = startIndex + matchText.length;
    });
    if (lastIndex < testString.length) {
      segments.push({ type: 'text', content: testString.substring(lastIndex) });
    }

    const lines: React.ReactNode[][] = [];
    let currentLine: React.ReactNode[] = [];
    let keyCounter = 0;

    for (const segment of segments) {
      let subSegments = segment.content.split('\n');
      for (let i = 0; i < subSegments.length; i++) {
        const part = subSegments[i];
        if (part) {
          if (segment.type === 'text') {
            currentLine.push(<Fragment key={keyCounter++}>{part}</Fragment>);
          } else {
            currentLine.push(<mark key={keyCounter++} className="bg-accent/40 text-accent-foreground rounded-sm">{part}</mark>);
          }
        }
        if (i < subSegments.length - 1) {
          lines.push(currentLine.length > 0 ? currentLine : [<Fragment key={keyCounter++}>{'\u00A0'}</Fragment>]);
          currentLine = [];
        }
      }
    }
    lines.push(currentLine.length > 0 ? currentLine : [<Fragment key={keyCounter++}>{'\u00A0'}</Fragment>]);
    
    return (
      <>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </>
    );
  }, [matches, testString, regexError]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold font-headline">正则表达式乐园</h1>
          <p className="text-muted-foreground text-sm">在线测试和调试正则表达式。</p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 flex flex-col gap-6">
        <Card className="border-t-4 border-destructive">
          <CardHeader>
            <CardTitle className="font-bold">表达式可视化</CardTitle>
            <CardDescription>正则表达式的图形化表示。</CardDescription>
          </CardHeader>
          <CardContent>
            <RegexVisualizer regex={regex} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-bold">正则表达式</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4 bg-muted/50 rounded-md p-2">
                  <span className="text-muted-foreground font-code text-lg mt-2">/</span>
                  <Textarea
                    id="regex-input"
                    name="regex"
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    placeholder="在此输入您的正则表达式"
                    className="font-code text-base flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                    aria-label="正则表达式输入"
                  />
                  <span className="text-muted-foreground font-code text-lg mt-2">/</span>
                </div>
                 {regexError && <p className="mt-2 text-destructive-foreground bg-destructive/80 p-2 rounded-md text-sm flex items-center gap-2"><AlertCircle size={16} /> {regexError}</p>}
                <div className="flex items-center space-x-4 mt-4 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="global" checked={globalSearch} onCheckedChange={setGlobalSearch} />
                    <Label htmlFor="global">全局 (g)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ignoreCase" checked={ignoreCase} onCheckedChange={setIgnoreCase} />
                    <Label htmlFor="ignoreCase">忽略大小写 (i)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="multiline" checked={multiline} onCheckedChange={setMultiline} />
                    <Label htmlFor="multiline">多行 (m)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-bold">测试字符串</CardTitle>
                <Button onClick={handleGenerateAndInsertData} disabled={isInsertingSample} size="sm">
                  {isInsertingSample ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  AI 插入数据
                </Button>
              </CardHeader>
              <CardContent>
                 <div className="relative h-48 border rounded-md">
                    <div
                      ref={scrollSyncRef}
                      aria-hidden="true"
                      className="absolute inset-0 m-0 overflow-auto pointer-events-none py-2 px-3 whitespace-pre-wrap font-code text-base md:text-sm leading-relaxed"
                    >
                      {highlightedTestString}
                    </div>
                    <Textarea
                      ref={textareaRef}
                      id="test-string-input"
                      name="testString"
                      value={testString}
                      onChange={(e) => setTestString(e.target.value)}
                      onScroll={(e) => {
                        if (scrollSyncRef.current) {
                          scrollSyncRef.current.scrollTop = e.currentTarget.scrollTop;
                          scrollSyncRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}
                      placeholder="在此输入您的测试字符串"
                      className="absolute inset-0 m-0 h-full w-full bg-transparent text-transparent caret-foreground resize-none py-2 px-3 focus-visible:ring-0 border-0 whitespace-pre-wrap font-code text-base md:text-sm leading-relaxed"
                      spellCheck="false"
                      aria-label="测试字符串输入"
                    />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="destructive" onClick={() => setTestString('')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    清除
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="font-bold">替换</CardTitle>
                <CardDescription>使用 $1, $2 等引用捕获的分组。</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="relative">
                    <Input
                      id="replacement-string-input"
                      name="replacementString"
                      value={replacementString}
                      onChange={(e) => setReplacementString(e.target.value)}
                      placeholder="输入替换字符串"
                      className="font-code text-sm"
                      aria-label="替换字符串输入"
                    />
                 </div>
                <Card className="mt-4 bg-muted/50 relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-code text-sm whitespace-pre-wrap break-all">
                      {replacementResult.split('\n').map((line, idx) => (
                        <div key={idx}>{line || '\u00A0'}</div>
                      ))}
                    </div>
                     <Button variant="ghost" size="sm" className="absolute top-4 right-2" onClick={() => handleCopy(replacementResult, '替换结果')}>
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            <Tabs defaultValue="matches" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matches">匹配</TabsTrigger>
                <TabsTrigger value="cheatsheet">速查表</TabsTrigger>
              </TabsList>
              <TabsContent value="matches" className="flex-grow overflow-y-auto mt-4 pr-2">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="font-bold">匹配结果 <Badge variant="secondary" className="ml-2">{matches.length}</Badge></CardTitle>
                      <Button variant="outline" size="sm" onClick={handleCopyAllMatches} disabled={matches.length === 0}>
                        <ClipboardCopy className="mr-2 h-4 w-4" />
                        复制全部
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {matches.length > 0 ? (
                        matches.map((match, index) => (
                          <Card key={index} className="bg-muted/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold">
                                  <span>匹配 {index + 1}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                              <div className="flex items-center justify-between text-sm font-code gap-2 bg-background p-1.5 rounded-md border">
                                  <span className="font-semibold text-muted-foreground">完整匹配:</span>
                                  <pre className="flex-grow overflow-x-auto mr-2">{match[0]}</pre>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopy(match[0], `完整匹配 ${index + 1}`)}>
                                    <ClipboardCopy className="h-4 w-4" />
                                    <span className="sr-only">复制完整匹配</span>
                                  </Button>
                              </div>
                              
                              {match.length > 1 ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">捕获分组：</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                      onClick={() => handleCopyAllGroups(match, index)}
                                    >
                                      <ClipboardCopy className="mr-2 h-3 w-3" />
                                      复制分组
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    {[...match].slice(1).map((group, groupIndex) => (
                                      <div key={groupIndex} className="flex items-center justify-between text-sm font-code gap-2 bg-background p-1.5 rounded-md border">
                                          <span className="text-muted-foreground">${groupIndex + 1}:</span>
                                          <pre className="flex-grow overflow-x-auto mr-2">{group ?? 'undefined'}</pre>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopy(group ?? '', `分组 ${groupIndex + 1}`)}>
                                            <ClipboardCopy className="h-3 w-3" />
                                            <span className="sr-only">复制分组 {groupIndex + 1}</span>
                                          </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (<p className="text-sm text-muted-foreground">未找到捕获分组。</p>)}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-8">未找到匹配项。</p>
                      )}
                    </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="cheatsheet" className="flex-grow overflow-y-auto mt-4 pr-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-bold">正则速查表</CardTitle>
                    <CardDescription>常用语法的快速参考。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CheatSheet />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        <p>由 Next.js 和 Genkit 驱动</p>
      </footer>
    </div>
  );
}
