import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  
  const response = await fetch(
    `${process.env.BENCHMARK_APP_URL}/api/scores?studentId=${studentId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.BENCHMARK_API_KEY}`
      }
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
