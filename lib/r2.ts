import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
}

export interface VideoFile {
    key: string;
    name: string;
    size: number;
    lastModified: string;
    id: string;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m3u8'];

/**
 * List all video files in the R2 bucket (root level).
 * Supports raw video files (mp4, mkv, webm, etc.) and HLS playlists.
 */
export async function listVideos(): Promise<VideoFile[]> {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;

    const command = new ListObjectsV2Command({
        Bucket: bucket,
    });

    const response = await client.send(command);
    const videos: VideoFile[] = [];

    if (response.Contents) {
        for (const obj of response.Contents) {
            if (!obj.Key) continue;
            const lowerKey = obj.Key.toLowerCase();
            const isVideo = VIDEO_EXTENSIONS.some((ext) => lowerKey.endsWith(ext));
            if (!isVideo) continue;

            // Use filename without extension as display name
            const parts = obj.Key.split('/');
            const filename = parts[parts.length - 1];
            const name = filename.replace(/\.[^/.]+$/, '');

            videos.push({
                key: obj.Key,
                name,
                size: obj.Size || 0,
                lastModified: obj.LastModified?.toISOString() || '',
                id: Buffer.from(obj.Key).toString('base64url'),
            });
        }
    }

    return videos;
}

/**
 * Generate a signed URL for any object in the R2 bucket.
 */
export async function getSignedVideoUrl(key: string, expiresIn = 7200): Promise<string> {
    const client = getR2Client();
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
}

/**
 * Resolve a base64url-encoded video ID back to its key.
 */
export function resolveVideoId(id: string): string {
    return Buffer.from(id, 'base64url').toString('utf-8');
}
