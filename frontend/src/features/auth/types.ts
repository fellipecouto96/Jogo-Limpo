export interface Organizer {
  id: string;
  name: string;
  email: string;
  publicSlug?: string;
}

export interface AuthResponse {
  token: string;
  organizer: Organizer;
}
