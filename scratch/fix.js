const fs = require('fs');

let extract = fs.readFileSync('lib/parsers/extract.ts', 'utf8');
extract = extract.replace(/const code = g\.length > 1 && g\[1\]\.toLowerCase\(\) === "x" \? parseInt\(g\.slice\(2\), 16\) : parseInt\(g\.slice\(1\), 10\);/g, 'const code = g.length > 1 && g[1]?.toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);');
extract = extract.replace(/const inner = m\[2\] \|\| "";/g, 'const inner = m?.[2] || "";');
extract = extract.replace(/const items = \[\.\.\.inner\.matchAll\(\/<li\\b\[\^>\]\*>\(\[\\s\\S\]\*\?\)<\/li>\/gi\)\]\.map\(\(x\) => • \$\{stripTags\(x\[1\]\)\}\)/g, 'const items = [...inner.matchAll(/<li\\\\b[^>]*>([\\\\s\\\\S]*?)<\\\\/li>/gi)].map((x) => • {stripTags(x[1] || "")})');
extract = extract.replace(/\[\.\.\.r\[1\]\.matchAll\(\/<t\[dh\]\\b\[\^>\]\*>\(\[\\s\\S\]\*\?\)<\/t\[dh\]>\/gi\)\]\.map\(\(c\) => stripTags\(c\[1\]\)\)/g, '[...r[1].matchAll(/<t[dh]\\\\b[^>]*>([\\\\s\\\\S]*?)<\\\\/t[dh]>/gi)].map((c) => stripTags(c[1] || ""))');
extract = extract.replace(/const slide = parseInt\(name\.match\(\/\\d\+\/\)!\[0\], 10\);/g, 'const slide = parseInt(name.match(/\\\\d+/)![0] || "0", 10);');
extract = extract.replace(/const xml = await zip\.files\[name\]\.async\("string"\);/g, 'const xml = await zip.files[name]?.async("string") || "";');
extract = extract.replace(/zip\.files\[notes\]\.async\("string"\)/g, 'zip.files[notes]?.async("string") || ""');
fs.writeFileSync('lib/parsers/extract.ts', extract);

let chunker = fs.readFileSync('lib/rag/chunker.ts', 'utf8');
chunker = chunker.replace(/const p = b\.locator\.part;/g, 'const p = b.locator?.part;');
chunker = chunker.replace(/const p2 = b2\.locator\.part;/g, 'const p2 = b2.locator?.part;');
chunker = chunker.replace(/return \{ kind: b\.kind, text: t, locator: b\.locator \};/g, 'return { kind: b.kind, text: t, locator: b.locator! };');
chunker = chunker.replace(/const h = a\.locator\.heading;/g, 'const h = a?.locator?.heading;');
chunker = chunker.replace(/\{ \.\.\.a, text: a\.text\.slice\(0, 200\) \+ "\.\.\." \}/g, '{ ...a!, text: a?.text.slice(0, 200) + "..." }');
fs.writeFileSync('lib/rag/chunker.ts', chunker);

let grading = fs.readFileSync('scripts/test-ai-grading.ts', 'utf8');
grading = grading.replace(/assignmentTitle: "Sistem Pencernaan Manusia",/g, 'assignmentId: "test", assignmentTitle: "Sistem Pencernaan Manusia",');
fs.writeFileSync('scripts/test-ai-grading.ts', grading);

console.log("Done");
