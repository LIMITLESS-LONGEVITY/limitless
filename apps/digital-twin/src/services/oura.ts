import crypto from 'node:crypto';

const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const OURA_API_BASE = 'https://api.ouraring.com/v2/usercollection';

// In-memory state → userId mapping for OAuth flow (TTL: 10 min)
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

function cleanExpiredStates() {
  const now = Date.now();
  for (const [key, val] of oauthStates) {
    if (val.expiresAt < now) oauthStates.delete(key);
  }
}

export function getAuthUrl(userId: string, redirectUri: string): string {
  cleanExpiredStates();
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { userId, expiresAt: Date.now() + 600_000 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'daily',
    state,
  });

  return `${OURA_AUTH_URL}?${params}`;
}

export function consumeState(state: string): string | null {
  cleanExpiredStates();
  const entry = oauthStates.get(state);
  if (!entry) return null;
  oauthStates.delete(state);
  return entry.userId;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function ouraGet(token: string, endpoint: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const res = await fetch(`${OURA_API_BASE}/${endpoint}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura API ${endpoint} failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchDailySleep(token: string, startDate: string, endDate: string) {
  return ouraGet(token, 'daily_sleep', startDate, endDate);
}

export async function fetchDailyActivity(token: string, startDate: string, endDate: string) {
  return ouraGet(token, 'daily_activity', startDate, endDate);
}

export async function fetchDailyReadiness(token: string, startDate: string, endDate: string) {
  return ouraGet(token, 'daily_readiness', startDate, endDate);
}
