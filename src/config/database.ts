import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.REACT_APP_NEON_DATABASE_URL!);

export default sql;
