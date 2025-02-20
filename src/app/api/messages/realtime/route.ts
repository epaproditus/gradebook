import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = new URL(request.url).searchParams;
  const lastSync = searchParams.get('lastSync');

  const query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (lastSync) {
    query.gt('created_at', lastSync);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
