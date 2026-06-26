import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    
    // Verify the user is authenticated and is an admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      source, 
      overview, 
      network, 
      genres, 
      watch_url, 
      poster_url,
      tvdb_id,
      tvdb_slug 
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Show name is required' }, { status: 400 });
    }

    // Create show in database. NB: the `shows` table has no `slug` column —
    // series URLs are derived from `name` at runtime (see utils/slugify +
    // [series]/page.tsx), so we must not send one or PostgREST rejects the
    // insert. Mirror the known-good findOrCreateShow insert (sets language).
    const { data: show, error } = await supabase
      .from('shows')
      .insert({
        name,
        source: source || 'rtp',
        language: 'pt',
        overview,
        network,
        genres: genres || [],
        watch_url,
        poster_url,
        tvdb_id: tvdb_id || null,
        tvdb_slug: tvdb_slug || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating show:', error);
      return NextResponse.json(
        { error: `Failed to create show: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(show);
  } catch (error) {
    console.error('Error in POST /api/shows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}