import { appendFileSync } from 'node:fs';

/** Ошибка шага: печатается аннотацией GitHub Actions, шаг завершается с кодом 1 */
export class StaticError extends Error {}

export function need(name: string): string {
    const value = process.env[name];
    if (!value) throw new StaticError(`Не задана переменная ${name}`);
    return value;
}

/** Выход шага workflow; вне GitHub Actions ничего не делает */
export function output(name: string, value: string): void {
    const file = process.env.GITHUB_OUTPUT;
    if (file) appendFileSync(file, `${name}=${value}\n`);
}
