
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

const commonPatterns = [
  {
    category: '数字类',
    patterns: [
      { name: '数字', regex: '[0-9]*' },
      { name: 'n位的数字', regex: '\\d{n}' },
      { name: '至少n位的数字', regex: '\\d{n,}' },
      { name: 'm-n位的数字', regex: '\\d{m,n}' },
      { name: '零和非零开头的数字', regex: '(0|[1-9][0-9]*)' },
      { name: '非零开头的最多带两位小数的数字', regex: '([1-9][0-9]*)+(\\.[0-9]{1,2})?' },
      { name: '带1-2位小数的正数或负数', regex: '(-)?\\d+(\\.\\d{1,2})?' },
      { name: '正数、负数、和小数', regex: '(-|\\+)?\\d+(\\.\\d+)?' },
      { name: '有两位小数的正实数', regex: '[0-9]+(\\.[0-9]{2})?' },
      { name: '有1~3位小数的正实数', regex: '[0-9]+(\\.[0-9]{1,3})?' },
      { name: '非零的正整数', regex: '[1-9]\\d*' },
      { name: '非零的负整数', regex: '-[1-9]\\d*' },
      { name: '非负整数', regex: '\\d+' },
      { name: '非正整数', regex: '-[1-9]\\d*|0' },
      { name: '非负浮点数', regex: '\\d+(\\.\\d+)?' },
      { name: '非正浮点数', regex: '((-\\d+(\\.\\d+)?)|(0+(\\.0+)?))' },
      { name: '正浮点数', regex: '[1-9]\\d*\\.\\d*|0\\.\\d*[1-9]\\d*' },
      { name: '浮点数（小数）', regex: '(-?\\d+)(\\.\\d+)?' },
      { name: '浮点数（严格）', regex: '^(-?[1-9]\\d*\\.\\d+|-?0\\.\\d*[1-9])$' },
    ],
  },
  {
    category: '字符串',
    patterns: [
        { name: '任意字符', regex: '[\\w\\W]+' },
        { name: '英文和数字', regex: '[A-Za-z0-9]+' },
        { name: '长度为3-20的所有字符', regex: '.{3,20}' },
        { name: '由26个英文字母组成的字符串', regex: '[A-Za-z]+' },
        { name: '由26个大写英文字母组成的字符串', regex: '[A-Z]+' },
        { name: '由26个小写英文字母组成的字符串', regex: '[a-z]+' },
        { name: '由数字和26个英文字母组成的字符串', regex: '[A-Za-z0-9]+' },
        { name: '由数字、26个英文字母或者下划线组成的字符串', regex: '\\w+' },
        { name: '中文、英文、数字包括下划线', regex: '[\\u4E00-\\u9FA5A-Za-z0-9_]+' },
        { name: '中文、英文、数字但不包括下划线等符号', regex: '[\\u4E00-\\u9FA5A-Za-z0-9]+' },
        { name: "可以输入含有^%&',;=?$\\等字符", regex: "[\\^%&',;=?$\\\\]+" },
        { name: '禁止输入含有~的字符', regex: '[^~]+' },
        { name: '中文字符（宽松）', regex: '[\\u4e00-\\u9fa5]' },
        { name: '中文汉字（严谨）', regex: '^(?:[\\u3400-\\u4DB5\\u4E00-\\u9FEA\\uFA0E\\uFA0F\\uFA11\\uFA13\\uFA14\\uFA1F\\uFA21\\uFA23\\uFA24\\uFA27-\\uFA29]|[\\uD840-\\uD868\\uD86A-\\uD86C\\uD86F-\\uD872\\uD874-\\uD879][\\uDC00-\\uDFFF]|\\uD869[\\uDC00-\\uDED6\\uDF00-\\uDFFF]|\\uD86D[\\uDC00-\\uDF34\\uDF40-\\uDFFF]|\\uD86E[\\uDC00-\\uDC1D\\uDC20-\\uDFFF]|\\uD873[\\uDC00-\\uDEA1\\uDEB0-\\uDFFF]|\\uD87A[\\uDC00-\\uDFE0])+$' },
        { name: '中文汉字 + 中文标点', regex: '[\\u4e00-\\u9fa5|\\u3002|\\uff1f|\\uff01|\\uff0c|\\u3001|\\uff1b|\\uff1a|\\u201c|\\u201d|\\u2018|\\u2019|\\uff08|\\uff09|\\u300a|\\u300b|\\u3008|\\u3009|\\u3010|\\u3011|\\u300e|\\u300f|\\u300c|\\u300d|\\ufe43|\\ufe44|\\u3014|\\u3015|\\u2026|\\u2014|\\uff5e|\\ufe4f|\\uffe5]' },
        { name: '日文字符', regex: '[\\u3040-\\u309f]' },
        { name: '双字节字符', regex: '[^\\x00-\\xff]' },
        { name: '数字/货币金额', regex: '(?:^[-]?[1-9]\\d{0,2}(?:$|(?:,\\d{3})*(?:$|(\\.\\d{1,2}$))))|(?:(?:^[0](\\.\\d{1,2})?)|(?:^[-][0]\\.\\d{1,2}))$' },
    ]
  },
  {
    category: '时间',
    patterns: [
      { name: '日期格式（宽松）', regex: '\\d{4}-\\d{1,2}-\\d{1,2}' },
      { name: '日期格式', regex: '^\\d{4}(-)(1[0-2]|0?\\d)\\1([0-2]\\d|\\d|30|31)$' },
      { name: '日期格式（严谨，支持闰年）', regex: '^(([0-9]{3}[1-9]|[0-9]{2}[1-9][0-9]{1}|[0-9]{1}[1-9][0-9]{2}|[1-9][0-9]{3})-(((0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01]))|((0[469]|11)-(0[1-9]|[12][0-9]|30))|(02-(0[1-9]|[1][0-9]|2[0-8]))))|((([0-9]{2})(0[48]|[2468][048]|[13579][26])|((0[48]|[2468][048]|[3579][26])00))-02-29)$' },
      { name: '一年的12个月(01～09和1～12)', regex: '(0?[1-9]|1[0-2])' },
      { name: '一个月的31天(01～09和1～31)', regex: '((0?[1-9])|((1|2)[0-9])|30|31)' },
      { name: '简单的日期判断（YYYY/MM/DD）', regex: '\\d{4}(\\-|\\/|\\.)\\d{1,2}\\1\\d{1,2}' },
      { name: '24小时制时间（HH:mm:ss）', regex: '^(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$' },
      { name: '12小时制时间（hh:mm:ss）', regex: '^(?:1[0-2]|0?[1-9]):[0-5]\\d:[0-5]\\d$' },
      { name: '中国省份', regex: '^浙江|上海|北京|天津|重庆|黑龙江|吉林|辽宁|内蒙古|河北|新疆|甘肃|青海|陕西|宁夏|河南|山东|山西|安徽|湖北|湖南|江苏|四川|贵州|云南|广西|西藏|江西|广东|福建|台湾|海南|香港|澳门$' },
    ]
  },
  {
    category: '颜色',
    patterns: [
      { name: '16进制颜色', regex: '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
      { name: 'RGB颜色代码', regex: '[rR][gG][Bb][(]((2[0-4][0-9]|25[0-5]|[01]?[0-9][0-9]?),){2}(2[0-4]\\d|25[0-5]|[01]?\\d\\d?)[)]{1}' },
    ]
  },
  {
    category: '标签',
    patterns: [
      { name: 'XML文件', regex: '([a-zA-Z]+-?)+[a-zA-Z0-9]+\\.[x|X][m|M][l|L]' },
      { name: 'HTML标记', regex: '<(\\S*?)[^>]*>.*?</\\1>|<.*? />' },
      { name: 'HTML注释', regex: '^<!--[\\s\\S]*?-->$' },
    ]
  },
  {
    category: '网络',
    patterns: [
      { name: '域名', regex: '[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(/.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+/.?' },
      { name: 'InternetURL', regex: '(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]' },
      { name: '迅雷链接', regex: '^thunder://[a-zA-Z0-9]+=$' },
      { name: '磁力链接(宽松匹配)', regex: '^magnet:\\?xt=urn:btih:[0-9a-fA-F]{40,}.*$' },
      { name: 'IPv4（宽松）', regex: '\\d+\\.\\d+\\.\\d+\\.\\d+' },
      { name: 'IPv4', regex: '((?:(?:25[0-5]|2[0-4]\\d|[01]?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d?\\d))' },
      { name: 'IPv6', regex: '^((([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}:[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){5}:([0-9A-Fa-f]{1,4}:)?[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){4}:([0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){3}:([0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){2}:([0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}((\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b)\\.){3}(\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b))|(([0-9A-Fa-f]{1,4}:){0,5}:((\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b)\\.){3}(\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b))|(::([0-9A-Fa-f]{1,4}:){0,5}((\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b)\\.){3}(\\b((25[0-5])|(1\\d{2})|(2[0-4]\\d)|(\\d{1,2}))\\b))|([0-9A-Fa-f]{1,4}::([0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})|(::([0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){1,7}:))$' },
      { name: '子网掩码（不含0.0.0.0）', regex: '^(?:\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])(?:\\.(?:\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])){3}$' },
      { name: 'MAC地址', regex: '^((([a-f0-9]{2}:){5})|(([a-f0-9]{2}-){5}))[a-f0-9]{2}$' },
      { name: '视频链接地址', regex: '^https?://.*?(?:swf|avi|flv|mpg|rm|mov|wav|asf|3gp|mkv|rmvb|mp4)$' },
      { name: '图片链接地址', regex: '^https?://.*?(?:gif|png|jpg|jpeg|webp|svg|psd|bmp|tif)$' },
    ]
  },
  {
    category: '其他',
    patterns: [
      { name: 'Email 地址', regex: '\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*' },
      { name: '手机号码', regex: '^(?:(?:\\+|00)86)?(13[0-9]|14[01456789]|15[0-35-9]|17[0-35-8]|18[0-35-9]|19[0-35-9])\\d{8}$' },
      { name: '手机机身码(IMEI)', regex: '^\\d{15,17}' },
      { name: '固定电话号码（中国）', regex: '^(?:(?:\\d{3}-)?\\d{8}|^(?:\\d{4}-)?\\d{7,8})(?:-\\d+)?$' },
      { name: '身份证号(宽松，15位、18位数字)', regex: '\\d{15}|\\d{18}' },
      { name: '1代身份证号（15位）', regex: '^[1-9]\\d{7}(?:0\\d|10|11|12)(?:0[1-9]|[1-2][\\d]|30|31)\\d{3}$' },
      { name: '2代身份证号（18位）', regex: '^[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|10|11|12)(?:0[1-9]|[1-2]\\d|30|31)\\d{3}[\\dXx]$' },
      { name: '中国身份证号（严谨，支持1/2代）', regex: '^\\d{6}((((((19|20)\\d{2})(0[13-9]|1[012])(0[1-9]|[12]\\d|30))|(((19|20)\\d{2})(0[13578]|1[02])31)|((19|20)\\d{2})02(0[1-9]|1\\d|2[0-8])|((((19|20)([13579][26]|[2468][048]|0[48]))|(2000))0229))\\d{3})|((((\\d{2})(0[13-9]|1[012])(0[1-9]|[12]\\d|30))|((\\d{2})(0[13578]|1[02])31)|((\\d{2})02(0[1-9]|1\\d|2[0-8]))|(([13579][26]|[2468][048]|0[048])0229))\\d{2}))(\\d|X|x)$' },
      { name: '护照ID（包含香港、澳门）', regex: '(^[EeKkGgDdSsPpHh]\\d{8}$)|(^(([Ee][a-fA-F])|([DdSsPp][Ee])|([Kk][Jj])|([Mm][Aa])|(1[45]))\\d{7}$)' },
      { name: '香港身份证号', regex: '^[a-zA-Z]\\d{6}\\([\\dA]\\)$' },
      { name: '澳门身份证号', regex: '^[1|5|7]\\d{6}\\(\\d\\)$' },
      { name: '台湾身份证号', regex: '^[a-zA-Z][0-9]{9}$' },
      { name: '帐号是否合法(字母开头，允许5-16字节，允许字母数字下划线)', regex: '[a-zA-Z][a-zA-Z0-9_]{4,15}' },
      { name: '密码(以字母开头，长度在6~18之间，只能包含字母、数字和下划线)', regex: '[a-zA-Z]\\w{5,17}' },
      { name: '强密码(必须包含大小写字母和数字的组合，不能使用特殊字符，长度在8-10之间)', regex: '(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,10}' },
      { name: '密码强度校验（最少6位，至少包含1个大写字母、1个小写字母、1个数字、1个特殊字符）', regex: '^\\S*(?=\\S{6,})(?=\\S*\\d)(?=\\S*[A-Z])(?=\\S*[a-z])(?=\\S*[!@#$%^&*? ])\\S*$' },
      { name: '首尾空白字符', regex: '^\\s*|\\s*$' },
      { name: '腾讯QQ号', regex: '[1-9][0-9]{4,}' },
      { name: '邮政编码（中国）', regex: '[1-9]\\d{5}(?!\\d)' },
      { name: 'A股代码', regex: '^(s[hz]|S[HZ])(000[\\d]{3}|002[\\d]{3}|300[\\d]{3}|600[\\d]{3}|60[\\d]{4})$' },
      { name: 'md5格式(32位)', regex: '^[a-fA-F0-9]{32}' },
      { name: '版本号（X.Y.Z）', regex: '^\\d+(?:\\.\\d+){2}$' },
      { name: 'base64格式', regex: '^\\s*data:(?:[a-z]+\\/[a-z0-9-+.]+(?:;[a-z-]+=[a-z0-9-]+)?)?(?:;base64)?,([a-z0-9!$&\'()*+;=\\-._~:@/?%\\s,]*?)\\s*$' },
      { name: '银行卡号（宽松，16位或19位）', regex: '^(?:[1-9]{1})(?:\\d{15}|\\d{18})$' },
      { name: '车牌号(新能源+非新能源)', regex: '^(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领 A-Z]{1}[A-HJ-NP-Z]{1}(?:(?:[0-9]{5}[DF])|(?:[DF](?:[A-HJ-NP-Z0-9])[0-9]{4})))|(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领 A-Z]{1}[A-Z]{1}[A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9 挂学警港澳]{1})$' },
      { name: '新能源车牌号', regex: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领 A-Z]{1}[A-HJ-NP-Z]{1}(([0-9]{5}[DF])|([DF][A-HJ-NP-Z0-9][0-9]{4}))$' },
      { name: '非新能源车牌号', regex: '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领 A-Z]{1}[A-HJ-NP-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$' },
      { name: '国内火车车次', regex: '^[GCDZTSPKXLY1-9]\\d{1,4}$' },
      { name: '统一社会信用代码', regex: '^[0-9A-HJ-NPQRTUWXY]{2}\\d{6}[0-9A-HJ-NPQRTUWXY]{10}$' },
      { name: 'GUID/UUID', regex: '^[a-f\\d]{4}(?:[a-f\\d]{4}-){4}[a-f\\d]{12}$' },
    ]
  },
];

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
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{'{n}'}</code> - 正好n次</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{'{n,}'}</code> - n次或更多次</li>
          <li><code className="font-code bg-muted px-1 py-0.5 rounded">{'{n,m}'}</code> - n到m次之间</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="groups">
      <AccordionTrigger>分组和范围</AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-4 text-sm">
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">分组并捕获：匹配 'pattern' 并捕获匹配项。可通过 $1, $2 等引用。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?:pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">分组但不捕获：当您需要对多个项进行分组但又不想保存匹配项时很有用。例如，`industr(?:y|ies)` 比 `industry|industries` 更高效。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?&lt;name&gt;pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">命名捕获分组：捕获 'pattern' 的匹配项，并为其分配一个名称 'name'。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">[abc]</code>
                <p className="pl-2 mt-1 text-muted-foreground">字符集：匹配 'a', 'b', 或 'c'。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">[^abc]</code>
                <p className="pl-2 mt-1 text-muted-foreground">排除型字符集：匹配任何非 'a', 'b', 或 'c' 的字符。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">[a-z]</code>
                <p className="pl-2 mt-1 text-muted-foreground">范围字符集：匹配从 'a' 到 'z' 的任何字符。</p>
            </li>
            <li className="!mt-6 pt-4 border-t">
                <p className="font-bold text-base">断言（零宽度）</p>
                <p className="text-muted-foreground">它们只断言某个位置是否满足条件，不消耗字符。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?=pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">正向先行断言：断言当前位置右侧能匹配 'pattern'。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?!pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">负向先行断言：断言当前位置右侧不能匹配 'pattern'。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?&lt;=pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">正向后行断言：断言当前位置左侧能匹配 'pattern'。</p>
            </li>
            <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?&lt;!pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">负向后行断言：断言当前位置左侧不能匹配 'pattern'。</p>
            </li>
             <li>
                <code className="font-code bg-muted px-1 py-0.5 rounded">(?&gt;pattern)</code>
                <p className="pl-2 mt-1 text-muted-foreground">原子分组：匹配 'pattern'，但禁止引擎在该分组内进行回溯。</p>
            </li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="common-patterns">
      <AccordionTrigger>常用模式</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6">
          {commonPatterns.map(section => (
            <div key={section.category}>
              <h4 className="font-bold text-base mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2">꧁ {section.category} ꧂</h4>
              <ul className="space-y-1">
                {section.patterns.map(p => (
                  <li key={p.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-2 rounded-md hover:bg-muted/50">
                    <span className="text-sm">{p.name}</span>
                    <code className="font-code bg-muted px-2 py-1 rounded text-sm text-right break-all">{p.regex}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default function RegexPlaygroundPage() {
  const { toast } = useToast();
  const [regex, setRegex] = useState('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|<(div|p|b|i).*?>([\\s\\S]*?)<\\/\\3>|1[3-9]\\d{9}');
  const [testString, setTestString] = useState('My email is example@domain.com, but not fake@domain.\nThis is a <b>bold</b> tag and this is a <div><p>italic</p></div> one.\nPhone numbers: 13912345678, 18687654321.\nInvalid phone: 12011112222.');
  const [replacementString, setReplacementString] = useState('【$1】-【$2】');
  
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

  const availableGroupIndices = useMemo(() => {
    if (matches.length === 0) return [];
    const allIndices = new Set<number>();
    matches.forEach(match => {
        if (match.length > 1) {
            for (let i = 1; i < match.length; i++) {
                if (match[i] !== undefined) {
                    allIndices.add(i);
                }
            }
        }
    });
    return Array.from(allIndices).sort((a, b) => a - b);
  }, [matches]);

  const handleCopyAllMatches = useCallback(() => {
    if (matches.length === 0) return;
    const allMatchesText = matches.map(match => match[0]).join('\n');
    handleCopy(allMatchesText, '所有匹配结果');
  }, [matches, handleCopy]);

  const handleCopyAllGroups = useCallback((match: RegExpMatchArray, matchIndex: number) => {
    if (match.length <= 1) return;
    const allGroupsText = [...match].slice(1).filter(g => g !== undefined).join('\n');
    handleCopy(allGroupsText, `匹配 ${matchIndex + 1} 的所有分组`);
  }, [handleCopy]);

  const handleCopyAllOfOneGroup = useCallback((groupIndex: number) => {
    if (matches.length === 0) return;
    const groupNText = matches
        .map(match => match[groupIndex])
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
                                  <pre className="flex-grow overflow-x-auto mr-2">{match[0]}</pre>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopy(match[0], `完整匹配 ${index + 1}`)}>
                                    <ClipboardCopy className="h-4 w-4" />
                                    <span className="sr-only">复制完整匹配</span>
                                  </Button>
                              </div>
                              
                              {match.length > 1 && [...match].slice(1).some(g => g !== undefined) ? (
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
