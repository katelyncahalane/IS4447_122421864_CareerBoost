// session – tiny asyncstorage wrapper for “logged in” username (no server)

// imports
import AsyncStorage from '@react-native-async-storage/async-storage';

// constant – storage key (bump suffix if you change stored shape)
const SESSION_KEY = '@is4447/session_v1';

// types – what we persist today (expand later if you add sqlite users)
export type Session = {
  username: string;
};

// read – return null if missing or corrupt json
export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

// write – overwrite whole session blob
export async function setSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// clear – log out helper
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
