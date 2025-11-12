"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const serverless_1 = require("@neondatabase/serverless");
function splitSqlStatements(input) {
    const stmts = [];
    let buf = '';
    let i = 0;
    let inSingle = false;
    let inDouble = false;
    let inLineComment = false;
    let inBlockComment = false;
    let inDollar = false;
    let dollarTag = null;
    const isTagChar = (ch) => /[A-Za-z0-9_]/.test(ch);
    while (i < input.length) {
        const ch = input[i];
        const next = i + 1 < input.length ? input[i + 1] : '';
        // Line comment
        if (inLineComment) {
            buf += ch;
            if (ch === '\n')
                inLineComment = false;
            i++;
            continue;
        }
        // Block comment
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                buf += '*/';
                i += 2;
                inBlockComment = false;
                continue;
            }
            buf += ch;
            i++;
            continue;
        }
        // Single-quoted string
        if (inSingle) {
            buf += ch;
            if (ch === "'") {
                if (next === "'") { // escaped single quote ''
                    buf += next;
                    i += 2;
                    continue;
                }
                inSingle = false;
            }
            i++;
            continue;
        }
        // Double-quoted identifier
        if (inDouble) {
            buf += ch;
            if (ch === '"') {
                if (next === '"') { // escaped double quote ""
                    buf += next;
                    i += 2;
                    continue;
                }
                inDouble = false;
            }
            i++;
            continue;
        }
        // Dollar-quoted string
        if (inDollar) {
            if (dollarTag && input.substr(i, dollarTag.length) === dollarTag) {
                buf += dollarTag;
                i += dollarTag.length;
                inDollar = false;
                dollarTag = null;
                continue;
            }
            buf += ch;
            i++;
            continue;
        }
        // Not in any quoted/comment context
        if (ch === '-' && next === '-') {
            buf += '--';
            i += 2;
            inLineComment = true;
            continue;
        }
        if (ch === '/' && next === '*') {
            buf += '/*';
            i += 2;
            inBlockComment = true;
            continue;
        }
        if (ch === "'") {
            buf += ch;
            inSingle = true;
            i++;
            continue;
        }
        if (ch === '"') {
            buf += ch;
            inDouble = true;
            i++;
            continue;
        }
        if (ch === '$') {
            // Check for $tag$ or $$
            let j = i + 1;
            while (j < input.length && isTagChar(input[j]))
                j++;
            if (j < input.length && input[j] === '$') {
                const tag = input.slice(i, j + 1); // includes both $
                buf += tag;
                dollarTag = tag;
                inDollar = true;
                i = j + 1;
                continue;
            }
            // Not a dollar-quote start
            buf += ch;
            i++;
            continue;
        }
        if (ch === ';') {
            const stmt = buf.trim();
            if (stmt.length > 0)
                stmts.push(stmt);
            buf = '';
            i++;
            continue;
        }
        buf += ch;
        i++;
    }
    const tail = buf.trim();
    if (tail.length > 0)
        stmts.push(tail);
    return stmts;
}
(async () => {
    try {
        const fileArg = process.argv[2];
        if (!fileArg) {
            console.error('Usage: npm run migrate -- <path-to-sql-file>');
            process.exit(1);
        }
        const filePath = path_1.default.isAbsolute(fileArg) ? fileArg : path_1.default.resolve(process.cwd(), fileArg);
        const sqlText = fs_1.default.readFileSync(filePath, 'utf8');
        const connStr = process.env.DATABASE_URL;
        if (!connStr) {
            console.error('DATABASE_URL not set in backend/.env');
            process.exit(1);
        }
        const sql = (0, serverless_1.neon)(connStr);
        const statements = splitSqlStatements(sqlText);
        if (statements.length === 0) {
            console.log(`No SQL statements found in: ${filePath}`);
            process.exit(0);
        }
        // Execute all statements atomically as a single transaction
        await sql.transaction(txn => statements.map(s => txn(s)));
        console.log(`Applied migration: ${filePath}`);
        process.exit(0);
    }
    catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
//# sourceMappingURL=run_migration.js.map