export interface Organizer {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  organizer: Organizer;
}
