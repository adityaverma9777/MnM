import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (password === process.env.MNM_PASSWORD) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Wrong password' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
