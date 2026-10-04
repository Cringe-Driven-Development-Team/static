import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Каталог репозитория, который один в один ложится в корень бакета статики */
export const DIR = 'static';

// Content-Type задаём сами; список расширений — он же список разрешённых в static/
export const TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};

export interface Entry {
    /** путь от static/ через «/» — он же ключ в бакете */
    key: string;
    isFile: boolean;
}

/** Всё, что лежит в static/, кроме каталогов: файлы и то, что файлом не является (ссылки) */
export async function listEntries(): Promise<Entry[]> {
    const entries = await readdir(DIR, { recursive: true, withFileTypes: true }).catch(() => []);
    return entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => ({
            key: join(entry.parentPath, entry.name)
                .slice(DIR.length + 1)
                .replaceAll('\\', '/'),
            isFile: entry.isFile(),
        }))
        .sort((a, b) => a.key.localeCompare(b.key));
}
