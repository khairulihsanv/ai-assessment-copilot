import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const targetDirs = [
    path.join(process.cwd(), 'app'),
    path.join(process.cwd(), 'prisma', 'seed.ts'),
];

targetDirs.forEach(dirOrFile => {
    if (fs.statSync(dirOrFile).isDirectory()) {
        walkDir(dirOrFile, (filePath) => {
            if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
                let content = fs.readFileSync(filePath, 'utf-8');
                let newContent = content
                    .replace(/mahasiswaId/g, 'userId')
                    .replace(/classId_mahasiswaId/g, 'classId_userId')
                    .replace(/assignmentId_mahasiswaId/g, 'assignmentId_userId');
                
                // Be careful with just 'mahasiswa', let's replace property access
                newContent = newContent.replace(/\.mahasiswa\b/g, '.user');
                newContent = newContent.replace(/mahasiswa: /g, 'user: ');
                newContent = newContent.replace(/mahasiswa: \{/g, 'user: {');

                if (content !== newContent) {
                    fs.writeFileSync(filePath, newContent, 'utf-8');
                    console.log(`Updated: ${filePath}`);
                }
            }
        });
    } else {
        // Just the seed.ts file
        let content = fs.readFileSync(dirOrFile, 'utf-8');
        let newContent = content.replace(/mahasiswaId/g, 'userId');
        newContent = newContent.replace(/\.mahasiswa\b/g, '.user');
        newContent = newContent.replace(/mahasiswa: /g, 'user: ');
        if (content !== newContent) {
            fs.writeFileSync(dirOrFile, newContent, 'utf-8');
            console.log(`Updated: ${dirOrFile}`);
        }
    }
});
