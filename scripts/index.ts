// Статика продукта: каталог static/ репозитория один в один ложится в корень бакета статики,
// файл static/img/moon.png отдаётся по https://static.cellestial.ru/img/moon.png.
// Файлы неизменяемы: из бакета ничего не удаляется и не перезаписывается.
import { check } from './check.ts';
import { StaticError } from './env.ts';
import { notify } from './notify.ts';
import { upload } from './upload.ts';

const USAGE = `Использование: bun scripts/index.ts <команда>
  check                                      проверка содержимого static/
  upload                                     static/** → s3://<бакет>/**
  notify <success|failure|cancelled> [sha]   сообщение в Telegram`;

async function main(command: string | undefined, args: string[]): Promise<void> {
    switch (command) {
        case 'check':
            return check();
        case 'upload':
            return upload();
        case 'notify':
            if (!args[0]) throw new StaticError(USAGE);
            return notify(args[0], args[1]);
        default:
            throw new StaticError(USAGE);
    }
}

const [command, ...args] = process.argv.slice(2);
try {
    await main(command, args);
} catch (err) {
    if (!(err instanceof StaticError)) throw err;
    console.error(`::error::${err.message}`);
    process.exit(1);
}
