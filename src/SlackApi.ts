import { dedupe } from './Dedupe';

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,pins:read,channels:read,files:read,files:write:user';

const redirectUrl = `${window.location.protocol}//${window.location.host}/`;

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

/**
 * Authorize or redirect for authorization
 */
export function authorize() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    window.location.assign(
      `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUrl}`
    );
  } else {
    fetch(
      `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUrl}`
    )
      .then(res => res.json())
      .then(rsp => {
        setAccessToken(rsp.access_token);
        window.location.assign(redirectUrl);
      });
  }
}

export function getAccessToken() {
  return window.localStorage.getItem('accessToken');
}

export function setAccessToken(token: string | undefined = undefined) {
  token
    ? window.localStorage.setItem('accessToken', token)
    : window.localStorage.removeItem('accessToken');
}

export interface SlackUser {
  id: string;
  name: string;
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
