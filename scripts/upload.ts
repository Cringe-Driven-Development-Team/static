import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { StaticError, output } from './env.ts';
import { DIR, TYPES, listEntries } from './files.ts';
import { getObject, openBucket, putObject } from './s3.ts';

const PARALLEL = 8;

interface Item {
    key: string;
    body: Uint8Array;
    /** что лежит в бакете под этим ключом: ничего, то же самое или другое содержимое */
    state: 'new' | 'same' | 'differs';
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && Buffer.compare(a, b) === 0;
}

/** static/** → s3://<бакет>/**; ключ, который уже есть в бакете, не перезаписывается */
export async function upload(): Promise<void> {
    const keys = (await listEntries()).map((entry) => entry.key);
    const bucket = openBucket();

    // сначала сверка всех файлов: при расхождении не загружается ничего
    const items: Item[] = [];
    for (let i = 0; i < keys.length; i += PARALLEL) {
        items.push(
            ...(await Promise.all(
                keys.slice(i, i + PARALLEL).map(async (key): Promise<Item> => {
                    const body = await readFile(join(DIR, key));
                    const stored = await getObject(bucket, key);
                    const state = !stored ? 'new' : equal(stored, body) ? 'same' : 'differs';
                    return { key, body, state };
                }),
            )),
        );
    }

    const differs = items.filter((item) => item.state === 'differs');
    if (differs.length > 0) {
        for (const { key } of differs) {
            console.error(
                `::error::${DIR}/${key}: в бакете под этим ключом другое содержимое — файлы не перезаписываются, новая версия кладётся под новым именем`,
            );
        }
        throw new StaticError(`Загрузка отменена: файлов с другим содержимым — ${differs.length}`);
    }

    const fresh = items.filter((item) => item.state === 'new');
    for (const { key } of items.filter((item) => item.state === 'same')) {
        console.log(`пропуск    ${key} — уже в бакете`);
    }
    for (let i = 0; i < fresh.length; i += PARALLEL) {
        await Promise.all(
            fresh.slice(i, i + PARALLEL).map(async ({ key, body }) => {
                const type = TYPES[extname(key)];
                if (!type) throw new StaticError(`${DIR}/${key}: расширение не из списка`);
                await putObject(bucket, key, body, type);
                console.log(`загружен   ${key}`);
            }),
        );
    }

    const skipped = items.length - fresh.length;
    output('uploaded', String(fresh.length));
    output('skipped', String(skipped));
    console.log(`s3://${bucket.name}/: загружено — ${fresh.length}, пропущено — ${skipped}`);
}
