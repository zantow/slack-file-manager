import { dedupe } from './Dedupe';

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,users.profile:read,pins:read,channels:read,files:read,files:write:user';

export const redirectUrl = `${window.location.protocol}//${window.location.host}/`;

const autoLogin = false;
const useLocalStorage = true;
export const userCache: { [key: string]: SlackUser } = {};
let accessToken: string | undefined = undefined;

interface SlackApiParams {
  [key: string]: string | number | boolean | undefined;
}

function slackApiFetch(path: string, params: SlackApiParams, method: 'GET' | 'POST' = 'GET') {
  let query = '';
  for (const k of Object.keys(params)) {
    if (params[k]) {
      query += `&${k}=${params[k]}`;
    }
  }

  const opts =
    method === 'GET'
      ? {}
      : {
          method,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        };

  const url = `https://slack.com/api/${path}?token=${getAccessToken()}${query}`;

  return dedupe(url, () => {
    return fetch(url, opts)
      .then(res => res.json())
      .then(rsp => {
        if (!rsp.ok) {
          if (rsp.error === 'missing_scope') {
            setAccessToken();
          }
          console.log(rsp);
          throw new Error('Invalid request');
        }
        return rsp;
      });
  });
}

export function get(path: string, params: SlackApiParams = {}) {
  return slackApiFetch(path, params);
}

export function post(path: string, params: SlackApiParams) {
  return slackApiFetch(path, params, 'POST');
}

export function getCurrentUser(): Promise<SlackUser | null> {
  if (!getAccessToken()) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      if (autoLogin) {
        window.location.replace(
          `https://slack.com/oauth/authorize?client_id=60448998578.533653717520&scope=${scopes}&redirect_uri=${redirectUrl}`
        );
      }
      return Promise.resolve(null);
    } else {
      window.history.replaceState({}, 'Slack File Manager', '/');
      return fetch(
        `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUrl}`
      )
        .then(res => res.json())
        .then(rsp => {
          setAccessToken(rsp.access_token);
          return getCurrentUser();
        });
    }
  }
  return get('users.profile.get').then(rsp => {
    return rsp;
  });
}

export function getUsers(cursor?: string): Promise<SlackUser[]> {
  if (!cursor && Object.keys(userCache).length > 0) {
    return Promise.resolve(
      Object.values(userCache).sort((a, b) => userName(a).localeCompare(userName(b)))
    );
  }
  return get('users.list', {
    cursor,
  }).then(rsp => {
    for (const u of rsp.members) {
      userCache[u.id] = u;
    }
    if (rsp.response_metadata && rsp.response_metadata.next_cursor) {
      return getUsers(rsp.response_metadata.next_cursor);
    }
    return Object.values(userCache).sort((a, b) => userName(a).localeCompare(userName(b)));
  });
}

export function userName(user: SlackUser) {
  return user.profile.display_name || user.name;
}

export function getAccessToken() {
  return useLocalStorage ? window.localStorage.getItem('accessToken') : accessToken;
}

export function setAccessToken(token: string | undefined = undefined) {
  if (!token) {
    useLocalStorage ? window.localStorage.removeItem('accessToken') : (accessToken = token);
  } else {
    useLocalStorage ? window.localStorage.setItem('accessToken', token) : (accessToken = token);
  }
}

export interface SlackUser {
  id: string;
  name: string;
  is_admin: boolean;
  profile: {
    display_name: string;
    image_24: string;
    image_48: string;
  };
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackFile {
  id: string;
  name: string;
  size: number;
  permalink: string;
  is_external: boolean;
  timestamp: number;
  user: string;
  mimetype: string;
  url_private: string;
  url_private_download: string;
}

export interface SlackMessage {
  files?: SlackFile[];
}

export interface SlackPin {
  message?: SlackMessage;
  file?: SlackFile;
}
