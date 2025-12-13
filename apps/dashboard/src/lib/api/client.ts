/**
 * API client for metrics endpoints
 */

import { getAccessToken } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL;

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchMetricsSummary(params: {
  days?: number;
  device?: string;
  country?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.country) searchParams.set('country', params.country);

  const url = `${API_BASE_URL}/metrics/web-vitals/summary?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics summary: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchMetricsRoutes(params: {
  days?: number;
  device?: string;
  country?: string;
  sortBy?: 'pageviews' | 'score' | 'LCP' | 'INP' | 'CLS';
  sortDir?: 'asc' | 'desc';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.country) searchParams.set('country', params.country);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/metrics/web-vitals/routes?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics routes: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchMetricsCountries(params: {
  days?: number;
  device?: string;
  sortBy?: 'pageviews' | 'score' | 'LCP' | 'INP' | 'CLS';
  sortDir?: 'asc' | 'desc';
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/metrics/web-vitals/countries?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metrics countries: ${response.statusText}`,
    );
  }

  return response.json();
}
