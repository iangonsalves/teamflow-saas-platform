export type AuthenticatedUser = {
  sub: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
};
