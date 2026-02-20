import { NextRequest, NextResponse } from 'next/server';
import { getSignedVideoUrl, resolveVideoId } from '@/lib/r2';

export async function GET(request: NextRequest) {
    const password = request.headers.get('x-mnm-password');
    if (password !== process.env.MNM_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const videoId = request.nextUrl.searchParams.get('id');
    if (!videoId) {
        return NextResponse.json({ error: 'Missing video id' }, { status: 400 });
    }

    try {
        const key = resolveVideoId(videoId);
        const url = await getSignedVideoUrl(key, 7200); // 2 hours
        return NextResponse.json({ url, key });
    } catch (error) {
        console.error('Failed to generate signed URL:', error);
        return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
    }
}
