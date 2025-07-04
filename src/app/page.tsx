
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

interface MatchResult {
  index: number;
  groups: string[];
}

const commonPatterns = [
  {
    category: "꧁ 数字类 ꧂",
    patterns: [
      { name: "数字", pattern: "[0-9]*" },
      { name: "n位的数字", pattern: "\\d{n}" },
      { name: "至少n位的数字", pattern: "\\d{n,}" },
      { name: "m-n位的数字", pattern: "\\d{m,n}" },
      { name: "零和非零开头的数字", pattern: "(0|[1-9][0-9]*)" },
      { name: "非零开头的最多带两位小数的数字", pattern: "([1-9][0-9]*)+(\\.[0-9]{1,2})?" },
      { name: "带1-2位小数的正数或负数", pattern: "(-)?\\d+(\\.\\d{1,2})?" },
      { name: "正数、负数、和小数", pattern: "(-|\\+)?\\d+(\\.\\d+)?" },
      { name: "有两位小数的正实数", pattern: "[0-9]+(\\.[0-9]{2})?" },
      { name: "有1~3位小数的正实数", pattern: "[0-9]+(\\.[0-9]{1,3})?" },
      { name: "非零的正整数", pattern: "[1-9]\\d*" },
      { name: "非零的负整数", pattern: "-[1-9]\\d*" },
      { name: "非负整数", pattern: "\\d+" },
      { name: "非正整数", pattern: "-[1-9]\\d*|0" },
      { name: "非负浮点数", pattern: "\\d+(\\.\\d+)?" },
      { name: "非正浮点数", pattern: "((-\\d+(\\.\\d+)?)|(0+(\\.0+)?))" },
      { name: "正浮点数", pattern: "[1-9]\\d*\\.\\d*|0\\.\\d*[1-9]\\d*" },
      { name: "浮点数（小数）", pattern: "(-?\\d+)(\\.\\d+)?" },
    ],
  },
  {
    category: "꧁ 字符串 ꧂",
    patterns: [
      { name: "任意字符", pattern: "[\\w\\W]+" },
      { name: "英文和数字", pattern: "[A-Za-z0-9]+" },
      { name: "长度为3-20的所有字符", pattern: ".{3,20}" },
      { name: "由26个英文字母组成的字符串", pattern: "[A-Za-z]+" },
      { name: "由26个大写英文字母组成的字符串", pattern: "[A-Z]+" },
      { name: "由26个小写英文字母组成的字符串", pattern: "[a-z]+" },
      { name: "由数字和26个英文字母组成的字符串", pattern: "[A-Za-z0-9]+" },
      { name: "由数字、26个英文字母或者下划线组成的字符串", pattern: "\\w+" },
      { name: "中文、英文、数字包括下划线", pattern: "[\\u4E00-\\u9FA5A-Za-z0-9_]+" },
      { name: "中文、英文、数字但不包括下划线等符号", pattern: "[\\u4E00-\\u9FA5A-Za-z0-9]+" },
      { name: "可以输入含有^%&',;=?$\\等字符", pattern: "[^%&',;=?$\\\\]+" },
      { name: "禁止输入含有~的字符", pattern: "[^~]+" },
      { name: "中文字符（宽松）", pattern: "[\\u4e00-\\u9fa5]" },
      { name: "双字节字符", pattern: "[^\\x00-\\xff]" },
    ],
  },
  {
    category: "꧁ 时间 ꧂",
    patterns: [
        { name: "日期格式（宽松）", pattern: "\\d{4}-\\d{1,2}-\\d{1,2}" },
        { name: "一年的12个月(01～09和1～12)", pattern: "(0?[1-9]|1[0-2])" },
        { name: "一个月的31天(01～09和1～31)", pattern: "((0?[1-9])|((1|2)[0-9])|30|31)" },
        { name: "24小时制时间（HH:mm:ss）", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$" },
        { name: "12小时制时间（hh:mm:ss）", pattern: "^(?:1[0-2]|0?[1-9]):[0-5]\\d:[0-5]\\d$" },
    ],
  },
  {
    category: "꧁ 网络 ꧂",
    patterns: [
        { name: "域名", pattern: "[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\\.?" },
        { name: "InternetURL", pattern: "(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]" },
        { name: "IPv4（宽松）", pattern: "\\d+\\.\\d+\\.\\d+\\.\\d+" },
    ]
  },
  {
    category: "꧁ 其他 ꧂",
    patterns: [
        { name: "Email 地址", pattern: "\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*" },
        { name: "手机号码", pattern: "^(?:(?:\\+|00)86)?(13[0-9]|14[01456789]|15[0-35-9]|17[0-35-8]|18[0-35-9]|19[0-35-9])\\d{8}$" },
        { name: "身份证号(宽松，15位、18位数字)", pattern: "\\d{15}|\\d{18}" },
        { name: "帐号是否合法(字母开头，允许5-16字节，允许字母数字下划线)", pattern: "[a-zA-Z][a-zA-Z0-9_]{4,15}" },
        { name: "密码(以字母开头，长度在6~18之间，只能包含字母、数字和下划线)", pattern: "[a-zA-Z]\\w{5,17}" },
        { name: "腾讯QQ号", pattern: "[1-9][0-9]{4,}" },
        { name: "邮政编码（中国）", pattern: "[1-9]\\d{5}(?!\\d)" },
    ]
  }
];

const CheatSheet = ({ onRegexClick }: { onRegexClick: (pattern: string, name: string) => void }) => (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="char-classes">
      <AccordionTrigger>字符类</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm text-muted-foreground pl-2">
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">.</code> - 任何字符 (换行符除外)</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\d</code> - 任何数字</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\D</code> - 任何非数字字符</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\w</code> - 任何单词字符 (a-z, A-Z, 0-9, _)</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\W</code> - 任何非单词字符</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\s</code> - 任何空白字符</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\S</code> - 任何非空白字符</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="anchors">
      <AccordionTrigger>锚点</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm text-muted-foreground pl-2">
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">^</code> - 字符串开头</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">$</code> - 字符串结尾</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\b</code> - 单词边界</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">\B</code> - 非单词边界</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">|</code> - 指明两项之间的一个选择</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="quantifiers">
      <AccordionTrigger>量词</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm text-muted-foreground pl-2">
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">*</code> - 0个或多个</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">+</code> - 1个或多个</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">?</code> - 0个或1个</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">{'{n}'}</code> - 正好n次</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">{'{n,}'}</code> - n次或更多次</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">{'{n,m}'}</code> - n到m次之间</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="grouping">
      <AccordionTrigger>分组 / 断言</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm text-muted-foreground pl-2">
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(pattern)</code> - 捕获分组：捕获匹配的子串，可通过 $1~$9 或 \1~\9 引用。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?:pattern)</code> - 非捕获分组：分组但不捕获，常用于结构清晰或配合 |。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?=pattern)</code> - 正向预查：匹配后面是 pattern 的位置（不消费字符）。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?!pattern)</code> - 负向预查：匹配后面不是 pattern 的位置（不消费字符）。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?&lt;=pattern)</code> - 正向回顾：匹配前面是 pattern 的位置（不消费字符）。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?&lt;!pattern)</code> - 负向回顾：匹配前面不是 pattern 的位置（不消费字符）。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?&gt;pattern)</code> - 原子分组：禁止回溯的贪婪匹配，提高性能。</li>
          <li><code className="font-code bg-muted px-1.5 py-0.5 rounded mr-2 text-foreground">(?&lt;name&gt;pattern)</code> - 命名分组：给分组命名，便于引用，如 \k&lt;name&gt;。</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="common-patterns">
        <AccordionTrigger>常用</AccordionTrigger>
        <AccordionContent>
            <div className="space-y-4">
                {commonPatterns.map((group) => (
                    <div key={group.category}>
                        <h4 className="mb-2 text-base font-semibold text-foreground">{group.category}</h4>
                        <div className="space-y-1">
                            {group.patterns.map((pattern) => (
                                <div
                                    key={pattern.name}
                                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onRegexClick(pattern.pattern, pattern.name)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRegexClick(pattern.pattern, pattern.name); }}
                                >
                                    <span className="text-sm text-muted-foreground">{pattern.name}</span>
                                    <code className="font-code rounded bg-background px-2 py-1 text-sm text-accent-foreground">{pattern.pattern}</code>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </AccordionContent>
    </AccordionItem>
  </Accordion>
);


export default function RegexPlaygroundPage() {
  const { toast } = useToast();
  const [regex, setRegex] = useState('((?<!库存)\\b\\d{4,5})');
  const [testString, setTestString] = useState('颜色01kc金黄色耳钉10313￥5.23库存8604对02KC金白色耳钉6389￥5.23库存8415对03KC金蓝色耳钉10312￥5.51库存8091对04KC金粉色耳钉6749￥5.23库存8632对05KC金黄色耳环6746￥5.23库存8665对06KC金白色耳环6722￥5.23库存8603对07黄色2对￥10.26库存8690对08·白色2对￥10.26库存8690对09KC金4786￥3.04库存6494对白色H-237￥5.13库存77对KC金·8657￥5.32库存119对KC金·A-1084￥3.99库存70对三角形藤编·10008￥5.13库存991对圆形藤编·10002￥5.13库存995对海星贝壳藤编·8933￥5.13库存983对贝壳藤编·8715￥5.13库存983对藤编米色·6257￥4.75库存992对藤编棕色·6724￥4.75库存990对藤编米色·11269￥4.75库存993对藤编米色·1119￥4.75库存981对藤编米色·4981￥4.75库存990对藤编米色1966￥4.75库存990对藤编咖色9947￥3.61库存978对藤编米色·9831￥3.8库存989对藤编咖色·0022￥3.33库存987对藤编米色DZ-167￥6.27库存989对KC金S363（布）￥2.76库存9624对');
  const [replacementString, setReplacementString] = useState('【$1】-【$2】');
  
  const [globalSearch, setGlobalSearch] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [multiline, setMultiline] = useState(true);
  
  const [regexError, setRegexError] = useState<string | null>(null);
  const [isInsertingSample, setIsInsertingSample] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [replacementResult, setReplacementResult] = useState('');

  const scrollSyncRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setIsLoading(true);
    setRegexError(null);

    debounceTimeoutRef.current = setTimeout(async () => {
      if (!regex) {
        setMatches([]);
        setReplacementResult(testString);
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/regex/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            regex,
            testString,
            replacementString,
            globalSearch,
            ignoreCase,
            multiline,
          }),
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.error) {
          setRegexError(result.error);
          setMatches([]);
          setReplacementResult('无效的正则表达式');
        } else {
          setMatches(result.matches || []);
          setReplacementResult(result.replacementResult || '');
          setRegexError(null);
        }
      } catch (e: any) {
        setRegexError(`连接后端失败: ${e.message}。请检查浏览器开发者工具中的“网络”选项卡，查看请求详情，并确认 ASP.NET 服务正在运行。`);
        setMatches([]);
        setReplacementResult('后端处理错误');
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce delay

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [regex, testString, replacementString, globalSearch, ignoreCase, multiline]);

  const handleCopy = useCallback((text: string, subject: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${subject}已复制！`,
      description: '文本已复制到您的剪贴板。',
    });
  }, [toast]);

  const handleCommonPatternClick = useCallback((pattern: string, name: string) => {
    setRegex(pattern);
    handleCopy(pattern, name);
    toast({
        title: '表达式已填充并复制！',
        description: `已将常用表达式 "${name}" 填入输入框。`,
    });
  }, [handleCopy, toast]);

  const availableGroupIndices = useMemo(() => {
    if (matches.length === 0) return [];
    const allIndices = new Set<number>();
    matches.forEach(match => {
        if (match.groups.length > 1) {
            for (let i = 1; i < match.groups.length; i++) {
                if (match.groups[i] !== undefined) {
                    allIndices.add(i);
                }
            }
        }
    });
    return Array.from(allIndices).sort((a, b) => a - b);
  }, [matches]);

  const handleCopyAllMatches = useCallback(() => {
    if (matches.length === 0) return;
    const allMatchesText = matches.map(match => match.groups[0]).join('\n');
    handleCopy(allMatchesText, '所有匹配结果');
  }, [matches, handleCopy]);

  const handleCopyAllGroups = useCallback((match: MatchResult, matchIndex: number) => {
    if (match.groups.length <= 1) return;
    const allGroupsText = match.groups.slice(1).filter(g => g !== undefined).join('\n');
    handleCopy(allGroupsText, `匹配 ${matchIndex + 1} 的所有分组`);
  }, [handleCopy]);

  const handleCopyAllOfOneGroup = useCallback((groupIndex: number) => {
    if (matches.length === 0) return;
    const groupNText = matches
        .map(match => match.groups[groupIndex])
        .filter(g => g !== undefined)
        .join('\n');
    handleCopy(groupNText, `所有匹配中的分组 ${groupIndex} 的内容`);
  }, [matches, handleCopy]);

  const handleGenerateAndInsertData = useCallback(async () => {
    if (!regex) {
      toast({
        variant: 'destructive',
        title: '请输入正则表达式',
        description: 'AI需要一个正则表达式来生成测试数据。',
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
        description: 'AI生成的测试数据已添加到测试字符串的开头。',
      });
    } catch (error) {
      console.error('生成数据时出错:', error);
      toast({
        variant: 'destructive',
        title: '生成失败',
        description: '无法生成示例数据。请检查您的网络连接或稍后再试。',
      });
    } finally {
      setIsInsertingSample(false);
    }
  }, [regex, toast]);

  const highlightedTestString = useMemo(() => {
    if (regexError || !testString || matches.length === 0) {
      const lines = (testString || '').split('\n');
      return lines.map((line, i) => <div key={i}>{line || '\u00A0'}</div>);
    }

    const segments: { type: 'text' | 'mark'; content: string }[] = [];
    let lastIndex = 0;
    matches.forEach((match) => {
      if (match.index === -1) return; // Should not happen with successful matches
      const startIndex = match.index;
      const matchText = match.groups[0];
      if (startIndex > lastIndex) {
        segments.push({ type: 'text', content: testString.substring(lastIndex, startIndex) });
      }
      segments.push({ type: 'mark', content: matchText });
      lastIndex = startIndex + (matchText?.length || 0);
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
            currentLine.push(<mark key={keyCounter++} className="bg-highlight text-highlight-foreground rounded-sm">{part}</mark>);
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
          <p className="text-muted-foreground text-sm">在线测试和调试正则表达式 (.NET 引擎)。</p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 flex flex-col gap-6">
        <Card className="border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="font-bold">表达式可视化</CardTitle>
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
                <div className="flex items-start gap-4 bg-muted/50 rounded-md p-2 relative">
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
                   {isLoading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                </div>
                 {regexError && <p className="mt-2 text-destructive-foreground bg-destructive/80 p-2 rounded-md text-sm flex items-center gap-2"><AlertCircle size={16} /> {regexError}</p>}
                <div className="flex items-center space-x-4 mt-4 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="global" checked={globalSearch} onCheckedChange={setGlobalSearch} />
                    <Label htmlFor="global">全局匹配</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ignoreCase" checked={ignoreCase} onCheckedChange={setIgnoreCase} />
                    <Label htmlFor="ignoreCase">忽略大小写</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="multiline" checked={multiline} onCheckedChange={setMultiline} />
                    <Label htmlFor="multiline">多行模式</Label>
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
                    <div
                      ref={scrollSyncRef}
                      aria-hidden="true"
                      className="absolute inset-0 m-0 overflow-auto pointer-events-none py-2 px-3 whitespace-pre-wrap font-code text-base md:text-sm leading-relaxed"
                    >
                      {highlightedTestString}
                    </div>
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
                    {availableGroupIndices.length > 0 && (
                      <CardContent className="py-4 border-b">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">批量复制分组</Label>
                          <div className="flex flex-wrap gap-2">
                            {availableGroupIndices.map(groupIndex => (
                              <Button
                                key={groupIndex}
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyAllOfOneGroup(groupIndex)}
                                title={`复制所有匹配中的分组 ${groupIndex} 的内容`}
                              >
                                <ClipboardCopy className="mr-2 h-3 w-3" />
                                复制所有分组 {groupIndex}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                    <CardContent className="space-y-4 pt-4">
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
                                  <pre className="flex-grow overflow-x-auto mr-2">{match.groups[0]}</pre>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopy(match.groups[0], `完整匹配 ${index + 1}`)}>
                                    <ClipboardCopy className="h-4 w-4" />
                                    <span className="sr-only">复制完整匹配</span>
                                  </Button>
                              </div>
                              
                              {match.groups.length > 1 && match.groups.slice(1).some(g => g !== undefined) ? (
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
                                    {match.groups.slice(1).map((group, groupIndex) => (
                                      group !== undefined && <div key={groupIndex} className="flex items-center justify-between text-sm font-code gap-2 bg-background p-1.5 rounded-md border">
                                          <span className="text-muted-foreground">${groupIndex + 1}:</span>
                                          <pre className="flex-grow overflow-x-auto mr-2">{group}</pre>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopy(group, `分组 ${groupIndex + 1}`)}>
                                              <ClipboardCopy className="h-3 w-3" />
                                              <span className="sr-only">复制分组 {groupIndex + 1}</span>
                                            </Button>
                                          </div>
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
                    <CheatSheet onRegexClick={handleCommonPatternClick} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        <p>由 Next.js, Genkit, 和 .NET 驱动</p>
      </footer>
    </div>
  );
}
