import { NextRequest, NextResponse } from 'next/server';
import { listVideos } from '@/lib/r2';

export async function GET(request: NextRequest) {
    // Verify password from header
    const password = request.headers.get('x-mnm-password');
    if (password !== process.env.MNM_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const videos = await listVideos();
        return NextResponse.json({ videos });
    } catch (error) {
        console.error('Failed to list videos:', error);
        return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 });
    }
}
