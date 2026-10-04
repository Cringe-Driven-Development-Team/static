import { execFileSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { StaticError } from './env.ts';
import { DIR, TYPES, listEntries } from './files.ts';

const MAX_SIZE = 2 * 1024 * 1024;
const NAME = /^[a-z0-9._-]+$/;
const STATUS: Record<string, string> = { M: 'изменён', D: 'удалён или переименован', T: 'изменён' };

function git(...args: string[]): string {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Файлы static/, которые есть в main и в ветке изменены, переименованы или удалены */
function changedSinceMain(): string[] {
    const main = process.env.BASE_REF || 'origin/main';
    let base: string;
    try {
        base = git('merge-base', main, 'HEAD').trim();
    } catch {
        throw new StaticError(
            `Не найдена общая история с ${main}: нужен git fetch origin main (в CI — fetch-depth: 0)`,
        );
    }
    // --no-renames: переименование видно как удаление старого имени; сравнение — с рабочим каталогом
    const fields = git('diff', '--name-status', '--no-renames', '-z', base, '--', DIR).split('\0');
    const errors: string[] = [];
    for (let i = 0; i + 1 < fields.length; i += 2) {
        const status = fields[i] ?? '';
        if (status === 'A') continue;
        errors.push(
            `${fields[i + 1]}: файл из main ${STATUS[status] ?? `затронут (${status})`} — новая версия кладётся под новым именем`,
        );
    }
    return errors;
}

/** Проверка содержимого static/ */
export async function check(): Promise<void> {
    const entries = await listEntries();
    const errors: string[] = [];
    for (const { key, isFile } of entries) {
        const path = join(DIR, key);
        if (!isFile) {
            errors.push(`${path}: не обычный файл (ссылка?)`);
            continue;
        }
        const bad = key.split('/').filter((part) => !NAME.test(part));
        if (bad.length > 0) {
            errors.push(
                `${path}: в имени допустимы строчная латиница, цифры, «-», «_» и «.» — не подходит '${bad.join("', '")}'`,
            );
        }
        if (!(extname(key) in TYPES)) {
            const allowed = Object.keys(TYPES)
                .map((ext) => ext.slice(1))
                .join(', ');
            errors.push(`${path}: расширение не из списка (${allowed})`);
        }
        const { size } = await stat(path);
        if (size > MAX_SIZE) {
            errors.push(`${path}: ${(size / 1024 / 1024).toFixed(2)} МБ — больше 2 МБ`);
        }
    }
    errors.push(...changedSinceMain());

    if (errors.length > 0) {
        for (const error of errors) console.error(`::error::${error}`);
        throw new StaticError(`Проверка ${DIR}/ не пройдена: ошибок — ${errors.length}`);
    }
    console.log(`Проверка ${DIR}/ пройдена: файлов — ${entries.length}`);
}
