/**
 * Upload video files to R2 bucket.
 * Usage: node scripts/upload.mjs "path/to/video.mkv"
 * Or:    node scripts/upload.mjs        (uploads all files from ./videos/)
 */

import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, createReadStream } from 'fs';
import { resolve, basename } from 'path';

// Load .env.local
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
const PART_SIZE = 50 * 1024 * 1024; // 50MB per part

async function uploadFile(filePath) {
    const fileName = basename(filePath);
    const fileSize = statSync(filePath).size;
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);

    console.log(`\n📤 Uploading: ${fileName} (${sizeMB} MB) → ${BUCKET}`);

    if (fileSize < PART_SIZE) {
        const body = readFileSync(filePath);
        await client.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: fileName,
            Body: body,
        }));
        console.log(`✅ Done: ${fileName}`);
        return;
    }

    // Multipart upload for large files
    const { UploadId } = await client.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: fileName,
    }));

    const fileBuffer = readFileSync(filePath);
    const totalParts = Math.ceil(fileSize / PART_SIZE);
    const parts = [];

    for (let i = 0; i < totalParts; i++) {
        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE, fileSize);
        const body = fileBuffer.subarray(start, end);

        const { ETag } = await client.send(new UploadPartCommand({
            Bucket: BUCKET,
            Key: fileName,
            UploadId,
            PartNumber: i + 1,
            Body: body,
        }));

        parts.push({ ETag, PartNumber: i + 1 });
        const pct = Math.round(((i + 1) / totalParts) * 100);
        process.stdout.write(`\r   Part ${i + 1}/${totalParts} (${pct}%)`);
    }

    await client.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: fileName,
        UploadId,
        MultipartUpload: { Parts: parts },
    }));

    console.log(`\n✅ Done: ${fileName}`);
}

// Main
const args = process.argv.slice(2);
let files = [];

if (args.length > 0) {
    files = args.map(f => resolve(f));
} else {
    const videosDir = resolve(process.cwd(), 'videos');
    try {
        const entries = readdirSync(videosDir);
        const videoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
        files = entries
            .filter(f => videoExts.some(ext => f.toLowerCase().endsWith(ext)))
            .map(f => resolve(videosDir, f));
    } catch {
        console.log('No ./videos/ folder found. Pass file paths as arguments.');
        process.exit(1);
    }
}

if (files.length === 0) {
    console.log('No video files found.');
    process.exit(1);
}

console.log(`🎬 Uploading ${files.length} file(s) to R2 bucket: ${BUCKET}`);

for (const file of files) {
    await uploadFile(file);
}

console.log('\n🎉 All uploads complete!');
