export type UserProfile = {
  uid: number;
  username: string;
  email: string;
  num_playlists: number;
  num_favorites: number;
  gender: string | null;
  age: number | null;
  street: string | null;
  city: string | null;
  province: string | null;
  isvip: 1 | 0;
  mbti: string | null;
  hobbies: string[];
  created_at?: string;
  updated_at?: string;
};

export type UpdateUserPayload = {
  username?: string;
  email?: string;
  gender?: string | null;
  age?: number | null;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  isVip?: 1 | 0;
  mbti?: string | null;
  hobbies?: string[];
};

export const fetchUserProfile = async (uid: string): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${uid}`);
  const body: UserProfile = await res.json();

  return body;
};

export const updateUserProfile = async (
  uid: string,
  payload: UpdateUserPayload
): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${uid}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body: UserProfile = await res.json();

  return body;
};
