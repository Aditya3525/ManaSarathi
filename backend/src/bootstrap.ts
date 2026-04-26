import path from 'path';
import dotenv from 'dotenv';

const envPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const databaseUrl = (process.env.DATABASE_URL || '').trim();
if (databaseUrl.startsWith('file:')) {
	const rawPath = databaseUrl.slice('file:'.length);
	if (rawPath.startsWith('./') || rawPath.startsWith('../')) {
		const absolute = path.resolve(__dirname, '..', rawPath).replace(/\\/g, '/');
		process.env.DATABASE_URL = `file:${absolute}`;
	}
}

void import('./server');
