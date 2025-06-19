import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import RTPScraperService from '@/lib/rtp-scraper';

export async function POST(request: NextRequest) {
  try {
    const { rtpUrl } = await request.json();
    
    // Get the authorization header for admin check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('Profile query result:', { profile, profileError, userId: user.id });
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: `Profile fetch error: ${profileError.message}` },
        { status: 500 }
      );
    }
    
    if (!profile || profile.role !== 'admin') {
      console.log('User is not admin:', { profile, role: profile?.role });
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    if (!rtpUrl) {
      return NextResponse.json(
        { error: 'RTP URL is required' },
        { status: 400 }
      );
    }
    
    // Validate RTP URL format
    const urlValidation = RTPScraperService.parseRTPUrl(rtpUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid RTP URL format. Please provide a series URL like: https://www.rtp.pt/play/p14147/o-americano' },
        { status: 400 }
      );
    }
    
    // Scrape series data
    const series = await RTPScraperService.scrapeSeries(rtpUrl);
    if (!series) {
      return NextResponse.json(
        { error: 'Failed to scrape series data from RTP' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      series
    });
    
  } catch (error) {
    console.error('RTP preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}