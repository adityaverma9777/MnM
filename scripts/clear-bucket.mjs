/**
 * Delete all objects from R2 bucket.
 * Usage: node scripts/clear-bucket.mjs
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
        env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
    }
}

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = env.R2_BUCKET_NAME;

const { Contents } = await client.send(new ListObjectsV2Command({ Bucket: BUCKET }));

if (!Contents || Contents.length === 0) {
    console.log('Bucket is already empty.');
    process.exit(0);
}

console.log(`🗑️  Deleting ${Contents.length} object(s) from ${BUCKET}...`);
Contents.forEach(obj => console.log(`   - ${obj.Key}`));

await client.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: Contents.map(obj => ({ Key: obj.Key })) },
}));

console.log('✅ Bucket emptied!');
