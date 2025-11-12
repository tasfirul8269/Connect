"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_1 = require("@neondatabase/serverless");
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('Please check your .env file in the backend folder.');
    process.exit(1);
}
const sql = (0, serverless_1.neon)(DATABASE_URL);
exports.default = sql;
//# sourceMappingURL=database.js.map