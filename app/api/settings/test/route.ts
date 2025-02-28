import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "设置API正常工作"
  });
} 