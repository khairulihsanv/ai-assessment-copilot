const fs = require('fs');

let extract = fs.readFileSync('lib/parsers/extract.ts', 'utf8');
extract = extract.replace(/stripTags\(x\[1\]\)/g, 'stripTags(x[1] || "")');
extract = extract.replace(/r\[1\]\.matchAll/g, '(r[1] || "").matchAll');
extract = extract.replace(/stripTags\(c\[1\]\)/g, 'stripTags(c[1] || "")');
extract = extract.replace(/p\[1\]\.matchAll/g, '(p[1] || "").matchAll');
fs.writeFileSync('lib/parsers/extract.ts', extract);

let chunker = fs.readFileSync('lib/rag/chunker.ts', 'utf8');
chunker = chunker.replace(/b\.locator\.part/g, 'b?.locator?.part');
chunker = chunker.replace(/b2\.locator\.part/g, 'b2?.locator?.part');
chunker = chunker.replace(/b\.kind/g, 'b!.kind');
chunker = chunker.replace(/b\.locator/g, 'b!.locator');
chunker = chunker.replace(/a\.locator\.heading/g, 'a?.locator?.heading');
chunker = chunker.replace(/\{ \.\.\.a/g, '{ ...a!');
chunker = chunker.replace(/a\.text\.slice/g, 'a!.text.slice');
fs.writeFileSync('lib/rag/chunker.ts', chunker);

