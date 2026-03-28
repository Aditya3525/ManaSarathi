import { vi } from 'vitest';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Ensure DATABASE_URL is defined so PrismaClient constructor doesn't throw during tests.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/maansarathi_test';

// Provide an in-memory mock of PrismaClient for tests to avoid requiring a real database.
vi.mock('@prisma/client', async () => {
	class MockPrismaClient {
		__data: Record<string, any[]>;

		constructor() {
			// Use a global in-memory store so multiple PrismaClient instances
			// (test file and app server) share the same mock database state.
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			if (!globalThis.__PRISMA_MOCK_DB) globalThis.__PRISMA_MOCK_DB = {};
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			this.__data = globalThis.__PRISMA_MOCK_DB;
			return new Proxy(this, {
				get: (target: any, prop: string) => {
					// Expose control methods directly
					if (prop === '$connect') return async () => {};
					if (prop === '$disconnect') return async () => {};
					if (prop === '$on') return (_: any, __: any) => {};
					if (prop === '$executeRawUnsafe') return async () => {};

					// Return a lightweight model proxy for any model access (e.g., prisma.user)
					if (!target.__data[prop]) target.__data[prop] = [];
					const modelArray = target.__data[prop];

					const modelProxy: any = {
						findUnique: async ({ where, select }: any = {}) => {
							if (!where) return null;
							const key = Object.keys(where)[0];
							const val = where[key];
							const found = modelArray.find((r: any) => String(r[key]) === String(val));
							if (!found) return null;
							if (select) {
								const out: any = {};
								Object.keys(select).forEach((k) => { if ((select as any)[k]) out[k] = found[k]; });
								return out;
							}
							return found;
						},
						upsert: async ({ where, update, create }: any) => {
							const key = Object.keys(where)[0];
							const val = where[key];
							let idx = modelArray.findIndex((r: any) => String(r[key]) === String(val));
							if (idx !== -1) {
								modelArray[idx] = { ...modelArray[idx], ...(update || {}) };
								return modelArray[idx];
							}
							const newObj = { id: (create && create.id) ? create.id : `mock-${Math.random().toString(36).slice(2,9)}`, ...(create || {}) };
							modelArray.push(newObj);
							return newObj;
						},
						create: async ({ data }: any) => {
							const newObj = { id: data.id || `mock-${Math.random().toString(36).slice(2,9)}`, ...(data || {}) };
							modelArray.push(newObj);
							return newObj;
						},
						update: async ({ where, data }: any) => {
							const key = Object.keys(where)[0];
							const val = where[key];
							const idx = modelArray.findIndex((r: any) => String(r[key]) === String(val));
							if (idx === -1) throw new Error('Record not found');
							modelArray[idx] = { ...modelArray[idx], ...(data || {}) };
							return modelArray[idx];
						},
						delete: async ({ where }: any) => {
							const key = Object.keys(where)[0];
							const val = where[key];
							const idx = modelArray.findIndex((r: any) => String(r[key]) === String(val));
							if (idx === -1) return null;
							const [removed] = modelArray.splice(idx, 1);
							return removed;
						},
						findMany: async ({ where }: any = {}) => {
							if (!where) return modelArray.slice();
							const keys = Object.keys(where);
							return modelArray.filter((item: any) => keys.every((k) => {
								const cond = (where as any)[k];
								if (cond && typeof cond === 'object') {
									if (cond.in) return cond.in.includes(item[k]);
									if (cond.contains) return String(item[k]).includes(cond.contains);
									return true;
								}
								return String(item[k]) === String(cond);
							}));
						}
						,
						findFirst: async ({ where }: any = {}) => {
							if (!where) return modelArray[0] || null;
							const keys = Object.keys(where);
							const found = modelArray.find((item: any) => keys.every((k) => {
								const cond = (where as any)[k];
								if (cond && typeof cond === 'object') {
									if (cond.in) return cond.in.includes(item[k]);
									if (cond.contains) return String(item[k]).includes(cond.contains);
									return true;
								}
								return String(item[k]) === String(cond);
							}));
							return found || null;
						}
					};

					return modelProxy;
				}
			});
		}
	}

	return { PrismaClient: MockPrismaClient };
});
