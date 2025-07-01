'use client';

import React, { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
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
  BookText,
  Binary,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';

type RegexExplanationPart = {
  type: 'group' | 'literal' | 'char-class' | 'quantifier' | 'anchor' | 'unknown';
  token: string;
  description: string;
};

const tokenDescriptions: Record<string, { type: RegexExplanationPart['type'], description: string }> = {
  '\\d': { type: 'char-class', description: 'Matches any digit (0-9).' },
  '\\w': { type: 'char-class', description: 'Matches any word character (alphanumeric & underscore).' },
  '\\s': { type: 'char-class', description: 'Matches any whitespace character.' },
  '.': { type: 'char-class', description: 'Matches any character except newline.' },
  '+': { type: 'quantifier', description: 'Matches one or more of the preceding token.' },
  '*': { type: 'quantifier', description: 'Matches zero or more of the preceding token.' },
  '?': { type: 'quantifier', description: 'Matches zero or one of the preceding token.' },
  '^': { type: 'anchor', description: 'Matches the start of the string.' },
  '$': { type: 'anchor', description: 'Matches the end of the string.' },
};

function parseRegex(regex: string): RegexExplanationPart[] {
  if (!regex) return [];
  const parts: RegexExplanationPart[] = [];
  let groupIndex = 1;

  // This is a simplified parser and not a full-fledged regex engine.
  const regexTokens = regex.match(/(\\[dws.])|(\(\?.)|(\(.)|(\))|(\[.*?\])|([+*?])|([.^$])|([^\\()\[\]+*?^$]+)/g) || [];

  let i = 0;
  while (i < regexTokens.length) {
    const token = regexTokens[i];
    
    if (token.startsWith('(') && !token.startsWith('(?:')) {
      parts.push({ type: 'group', token: `Group #${groupIndex++}`, description: `Capturing group. Matches the enclosed tokens.` });
      i++;
      continue;
    }
    
    const description = tokenDescriptions[token];
    if (description) {
      parts.push({ type: description.type, token, description: description.description });
    } else if (/^[^\\()\[\]+*?^$]+$/.test(token)) {
      parts.push({ type: 'literal', token, description: `Matches the literal string "${token}".` });
    } else if (token.startsWith('[')) {
       parts.push({ type: 'char-class', token, description: `Character set. Matches any one of the enclosed characters.` });
    }
    else {
        // Skip tokens like ')' which are handled by group logic, or other complex tokens.
        if (token !== ')') {
           parts.push({ type: 'unknown', token, description: 'A more complex token.' });
        }
    }
    i++;
  }

  return parts;
}

const CheatSheet = () => (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="char-classes">
      <AccordionTrigger>Character Classes</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">.</code> - Any character (except newline)</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\d</code> - Any digit</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\D</code> - Any non-digit</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\w</code> - Any word character (a-z, A-Z, 0-9, _)</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\W</code> - Any non-word character</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\s</code> - Any whitespace character</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\S</code> - Any non-whitespace character</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="anchors">
      <AccordionTrigger>Anchors</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">^</code> - Start of string</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">$</code> - End of string</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\b</code> - Word boundary</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">\B</code> - Non-word boundary</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="quantifiers">
      <AccordionTrigger>Quantifiers</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">*</code> - 0 or more</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">+</code> - 1 or more</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">?</code> - 0 or 1</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n}`}</code> - Exactly n times</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n,}`}</code> - n or more times</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{`{n,m}`}</code> - Between n and m times</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="groups">
      <AccordionTrigger>Groups & Ranges</AccordionTrigger>
      <AccordionContent>
         <ul className="space-y-2 text-sm">
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">(...)</code> - Capturing group</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">(?:...)</code> - Non-capturing group</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[abc]</code> - Matches a, b, or c</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[^abc]</code> - Matches any character except a, b, c</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">[a-z]</code> - Matches any character from a to z</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default function RegexPlaygroundPage() {
  const { toast } = useToast();
  const [regex, setRegex] = useState('(\\d+)aa(\\d+)bb');
  const [testString, setTestString] = useState('11aa22bb33cc\n743aa47bb\n62aa2bb\nThis line will not match.');
  const [replacementString, setReplacementString] = useState('-$2-is-after-$1-');
  
  const [globalSearch, setGlobalSearch] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [multiline, setMultiline] = useState(false);
  
  const [regexError, setRegexError] = useState<string | null>(null);

  const [generatedData, setGeneratedData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
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
      title: `${subject} copied!`,
      description: 'The text has been copied to your clipboard.',
    });
  }, [toast]);

  const handleGenerateData = useCallback(async () => {
    if (!regex || regexError) {
      toast({
        variant: 'destructive',
        title: 'Invalid Regular Expression',
        description: 'Please enter a valid regex before generating data.',
      });
      return;
    }
    setIsGenerating(true);
    setGeneratedData('');
    try {
      const result = await generateRegexData({ regex });
      setGeneratedData(result.sampleData);
    } catch (error) {
      console.error('Error generating data:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate data for this regex.',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [regex, regexError, toast]);

  const { matches, replacementResult } = useMemo(() => {
    if (regexError) {
      return { matches: [], replacementResult: 'Invalid Regex' };
    }
    try {
      const flags = `${globalSearch ? 'g' : ''}${ignoreCase ? 'i' : ''}${multiline ? 'm' : ''}`;
      const re = new RegExp(regex, flags);
      
      const currentMatches = globalSearch ? [...testString.matchAll(re)] : (testString.match(re) ? [testString.match(re)!] : []);
      const currentReplacementResult = testString.replace(re, replacementString);

      return { matches: currentMatches, replacementResult: currentReplacementResult };
    } catch (e) {
      // This case should be covered by the useEffect, but as a fallback:
      return { matches: [], replacementResult: 'Invalid Regex' };
    }
  }, [regex, testString, replacementString, globalSearch, ignoreCase, multiline, regexError]);

  const explanation = useMemo(() => parseRegex(regex), [regex]);

  const highlightedTestString = useMemo(() => {
    if (regexError || !testString || matches.length === 0) {
      return testString;
    }
  
    let lastIndex = 0;
    const parts: (JSX.Element | string)[] = [];
  
    matches.forEach((match, i) => {
      const startIndex = match.index!;
      const matchText = match[0];
      
      // Text before match
      parts.push(testString.substring(lastIndex, startIndex));
      
      // The highlighted match
      parts.push(
        <mark key={i} className="bg-accent/40 text-accent-foreground rounded px-1">
          {matchText}
        </mark>
      );
      
      lastIndex = startIndex + matchText.length;
    });
  
    // Text after the last match
    parts.push(testString.substring(lastIndex));
  
    return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
  }, [matches, testString, regexError]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold font-headline">Regex Playground</h1>
          <p className="text-muted-foreground text-sm">Test, visualize, and generate data from regular expressions.</p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regular Expression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <span className="text-muted-foreground font-code text-lg mt-2">/</span>
                  <Textarea
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    placeholder="Enter your regex here"
                    className="font-code text-base flex-1 bg-card border-0 shadow-none focus-visible:ring-0"
                    aria-label="Regular Expression Input"
                  />
                  <span className="text-muted-foreground font-code text-lg mt-2">/</span>
                </div>
                 {regexError && <p className="mt-2 text-destructive-foreground bg-destructive/80 p-2 rounded-md text-sm flex items-center gap-2"><AlertCircle size={16} /> {regexError}</p>}
                <div className="flex items-center space-x-4 mt-4 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="global" checked={globalSearch} onCheckedChange={setGlobalSearch} />
                    <Label htmlFor="global">Global (g)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="ignoreCase" checked={ignoreCase} onCheckedChange={setIgnoreCase} />
                    <Label htmlFor="ignoreCase">Ignore Case (i)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="multiline" checked={multiline} onCheckedChange={setMultiline} />
                    <Label htmlFor="multiline">Multiline (m)</Label>
                  </div>
                </div>
                <div className="mt-4 border-t pt-4">
                    <Button onClick={handleGenerateData} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Sample Data
                    </Button>
                    {generatedData && (
                        <Card className="mt-4 bg-muted/50">
                            <CardContent className="p-4">
                               <p className="font-code text-sm break-all">{generatedData}</p>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleCopy(generatedData, 'Generated data')}>
                                    <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test String</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea
                    value={testString}
                    onChange={(e) => setTestString(e.target.value)}
                    placeholder="Enter your test string here"
                    className="font-code text-sm h-48 leading-relaxed"
                    aria-label="Test String Input"
                  />
                   <div className="absolute inset-0 p-3 pointer-events-none font-code text-sm leading-relaxed whitespace-pre-wrap">
                      {highlightedTestString}
                    </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Substitution</CardTitle>
                <CardDescription>Use $1, $2, etc. to reference captured groups.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={replacementString}
                  onChange={(e) => setReplacementString(e.target.value)}
                  placeholder="Enter replacement string"
                  className="font-code text-sm"
                  aria-label="Replacement String Input"
                />
                <Card className="mt-4 bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="font-code text-sm whitespace-pre-wrap break-all">{replacementResult}</pre>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleCopy(replacementResult, 'Replacement result')}>
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            <Tabs defaultValue="matches" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="matches"><Binary className="mr-2 h-4 w-4" />Matches</TabsTrigger>
                <TabsTrigger value="explanation"><Sparkles className="mr-2 h-4 w-4" />Explanation</TabsTrigger>
                <TabsTrigger value="cheatsheet"><BookText className="mr-2 h-4 w-4" />Cheatsheet</TabsTrigger>
              </TabsList>
              <TabsContent value="matches" className="flex-grow overflow-y-auto mt-4 pr-2">
                 <Card>
                    <CardHeader>
                      <CardTitle>Match Results <Badge variant="secondary" className="ml-2">{matches.length}</Badge></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {matches.length > 0 ? (
                        matches.map((match, index) => (
                          <Card key={index} className="bg-muted/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex justify-between items-center">
                                  <span>Match {index + 1}</span>
                                   <Button variant="ghost" size="sm" onClick={() => handleCopy(match[0], `Match ${index+1}`)}>
                                     <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Match
                                   </Button>
                                </CardTitle>
                                <pre className="font-code text-sm p-2 bg-background rounded-md mt-1">{match[0]}</pre>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm font-medium mb-2">Groups:</p>
                              {match.length > 1 ? ([...match].slice(1).map((group, groupIndex) => (
                                <div key={groupIndex} className="flex items-center justify-between text-sm mb-1 font-code">
                                    <span className="text-muted-foreground">${groupIndex + 1}:</span>
                                    <pre className="p-1 bg-background rounded-md">{group ?? 'undefined'}</pre>
                                </div>
                              ))) : (<p className="text-sm text-muted-foreground">No capturing groups found.</p>)}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No matches found.</p>
                      )}
                    </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="explanation" className="flex-grow overflow-y-auto mt-4">
                <Card>
                    <CardHeader>
                      <CardTitle>Regex Explanation</CardTitle>
                      <CardDescription>A step-by-step breakdown of your expression.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {explanation.length > 0 ? explanation.map((part, index) => (
                            <div key={index} className="flex items-start gap-4 p-2 rounded-md hover:bg-muted/50">
                                <ChevronRight className="h-5 w-5 mt-0.5 text-accent flex-shrink-0"/>
                                <div>
                                    <p className="font-bold font-code">{part.token}</p>
                                    <p className="text-sm text-muted-foreground">{part.description}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center py-8">Enter a regular expression to see its explanation.</p>
                        )}
                    </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="cheatsheet" className="flex-grow overflow-y-auto mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Regex Cheatsheet</CardTitle>
                    <CardDescription>A quick reference for common syntax.</CardDescription>
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
        <p>Powered by Next.js and Genkit</p>
      </footer>
    </div>
  );
}
