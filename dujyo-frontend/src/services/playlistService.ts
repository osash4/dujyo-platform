import { getApiBaseUrl } from '../utils/apiConfig';

export interface Playlist {
  playlist_id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_public: boolean;
  is_collaborative: boolean;
  track_count: number;
  total_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrack {
  playlist_track_id: string;
  playlist_id: string;
  content_id: string;
  position: number;
  added_at: string;
  added_by?: string;
  title?: string;
  artist_name?: string;
  thumbnail_url?: string;
  content_type?: string;
  duration?: number;
}

export interface CreatePlaylistRequest {
  title: string;
  description?: string;
  cover_image_url?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('jwt_token');
};

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Get all playlists for the current user
export const getPlaylists = async (includePublic: boolean = false): Promise<Playlist[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/v1/playlists?include_public=${includePublic}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch playlists: ${response.statusText}`);
  }

  const data = await response.json();
  return data.playlists || [];
};

// Get a specific playlist
export const getPlaylist = async (playlistId: string): Promise<Playlist> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return data.playlist!;
};

// Create a new playlist
export const createPlaylist = async (request: CreatePlaylistRequest): Promise<Playlist> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to create playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return data.playlist!;
};

// Update a playlist
export const updatePlaylist = async (
  playlistId: string,
  updates: Partial<CreatePlaylistRequest>
): Promise<Playlist> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update playlist: ${response.statusText}`);
  }

  const data = await response.json();
  return data.playlist!;
};

// Delete a playlist
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete playlist: ${response.statusText}`);
  }
};

// Get tracks in a playlist
export const getPlaylistTracks = async (playlistId: string): Promise<PlaylistTrack[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}/tracks`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist tracks: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tracks || [];
};

// Add a track to a playlist
export const addTrackToPlaylist = async (
  playlistId: string,
  contentId: string,
  position?: number
): Promise<PlaylistTrack[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content_id: contentId, position }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to add track: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tracks || [];
};

// Remove a track from a playlist
export const removeTrackFromPlaylist = async (
  playlistId: string,
  trackId: string
): Promise<PlaylistTrack[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/v1/playlists/${playlistId}/tracks/${trackId}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove track: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tracks || [];
};

// Reorder tracks in a playlist
export const reorderPlaylistTracks = async (
  playlistId: string,
  trackPositions: Array<{ trackId: string; position: number }>
): Promise<PlaylistTrack[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/v1/playlists/${playlistId}/reorder`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      track_positions: trackPositions.map((tp) => [tp.trackId, tp.position]),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reorder tracks: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tracks || [];
};

