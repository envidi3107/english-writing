// Register jest-dom matchers on the global `expect` that test files use (vitest globals).
// Importing '@testing-library/jest-dom/vitest' or `expect` from 'vitest' can bind to a second
// vitest module instance on Windows when the drive-letter casing of the cwd differs (c:\ vs C:\).
import * as matchers from '@testing-library/jest-dom/matchers';

(globalThis as unknown as { expect: { extend(m: object): void } }).expect.extend(matchers);
