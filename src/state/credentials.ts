const ACCESS_KEY_ID = "accessKeyId";
const SECRET_ACCESS_KEY = "secretAccessKey";
const CREDENTIALS_EXPIRY = "credentialsExpiry"


export interface Credentials {
    accessKeyId: string;
    secretAccessKey: string;
}

export const getCredentials = (): Credentials | null => {
    const accessKeyId = localStorage.getItem(ACCESS_KEY_ID);
    const secretAccessKey = localStorage.getItem(SECRET_ACCESS_KEY);
    if (!accessKeyId || !secretAccessKey) return null;
    const expiry = Number.parseInt(localStorage.getItem(CREDENTIALS_EXPIRY) ?? '');
    const now = new Date().getUTCSeconds()
    if (expiry && !(Number.isNaN(expiry)) && now > expiry) {
        clearCredentials();
        return null;
    }
    return { accessKeyId, secretAccessKey };
}

export const setCredentials = (credentials: Credentials) => {
    const now = new Date().getUTCSeconds() + 24*60*60
    localStorage.setItem(ACCESS_KEY_ID, credentials.accessKeyId);
    localStorage.setItem(SECRET_ACCESS_KEY, credentials.secretAccessKey);
    localStorage.setItem(CREDENTIALS_EXPIRY, now.toString())
}

export const clearCredentials = () => {
    localStorage.removeItem(ACCESS_KEY_ID);
    localStorage.removeItem(SECRET_ACCESS_KEY);
    localStorage.removeItem(CREDENTIALS_EXPIRY);
}

export const hasCredentials = (): boolean => {
    const credentials = getCredentials();
    return credentials !== null;
}
