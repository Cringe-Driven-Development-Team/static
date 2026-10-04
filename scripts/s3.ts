import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StaticError, need } from './env.ts';

export const IMMUTABLE = 'public, max-age=31536000, immutable';

export interface Bucket {
    client: S3Client;
    name: string;
}

export function openBucket(): Bucket {
    const endpoint = need('S3_ENDPOINT');
    // регион подписи у Selectel — пул из адреса: https://s3.<пул>.storage.selcloud.ru
    const region = process.env.S3_REGION || /^https?:\/\/s3\.([^./]+)\./.exec(endpoint)?.[1];
    if (!region) {
        throw new StaticError('Не удалось взять регион из S3_ENDPOINT, задайте S3_REGION');
    }
    const client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        credentials: {
            accessKeyId: need('S3_ACCESS_KEY'),
            secretAccessKey: need('S3_SECRET_KEY'),
        },
        // S3 Selectel не считает контрольные суммы, которые SDK шлёт по умолчанию
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    });
    return { client, name: need('S3_BUCKET') };
}

/** null — такого ключа в бакете нет */
export async function getObject(bucket: Bucket, key: string): Promise<Uint8Array | null> {
    try {
        const res = await bucket.client.send(new GetObjectCommand({ Bucket: bucket.name, Key: key }));
        return (await res.Body?.transformToByteArray()) ?? new Uint8Array();
    } catch (err) {
        if (err instanceof NoSuchKey) return null;
        throw err;
    }
}

export async function putObject(
    bucket: Bucket,
    key: string,
    body: Uint8Array,
    contentType: string,
): Promise<void> {
    await bucket.client.send(
        new PutObjectCommand({
            Bucket: bucket.name,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: IMMUTABLE,
        }),
    );
}
