import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import ListItemText from "@material-ui/core/ListItemText";
import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import {Tooltip} from "./Tooltip";
import {ListItemSecondaryAction} from "@material-ui/core";

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,files:read,files:write:user';
const perPage = 20;

const url = window.location.host === 'localhost' ? 'http://localhost:3000/' : 'https://slack-file-manager.herokuapp.com/';

/**
 * Authorize or redirect for authorization
 */
function authorize() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    window.location.assign(`https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${url}`);
  } else {
    fetch(`https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${url}`)
      .then(res => res.json())
      .then(rsp => {
        setAccessToken(rsp.access_token);
        window.location.assign(url);
      });
  }
}

function getAccessToken() {
  return window.localStorage.getItem('accessToken');
}

function setAccessToken(token: string | undefined = undefined) {
  token ? window.localStorage.setItem('accessToken', token) : window.localStorage.removeItem('accessToken');
}

interface SlackFile {
  id: string;
  name: string;
  permalink: string;
  is_external: boolean;
  timestamp: number;
  user: string;
  mimetype: string;
  url_private: string;
}

interface SlackUser {
  id: string;
  name: string;
  profile: {
    display_name: string;
    image_24: string;
    image_48: string;
  }
}

const userCache: { [key: string]: SlackUser } = {};

interface AppProps {
}

interface AppState {
  files: SlackFile[];
  selectedItems: { [key: string]: boolean };
  lastPage: number;
}

class App extends Component<AppProps, AppState> {
  state: AppState = { files: [], selectedItems: {}, lastPage: 0 };

  componentWillMount(): void {
    if (!getAccessToken()) {
      authorize();
    } else {
      this.fetchFiles();
    }
  }

  fetchFiles(page = 1) {
    // could list based on timestamp using: ts_to=${timestamp}
    fetch(`https://slack.com/api/files.list?token=${getAccessToken()}&count=${perPage}&page=${page}`)
      .then(res =>  res.json())
      .then(rsp => {
        if (!rsp.ok) {
          if (rsp.error === "missing_scope") {
            setAccessToken();
          }
          throw new Error('Invalid request');
        }
        if (rsp.paging && rsp.paging.page > 1) {
          this.setState({files: [...this.state.files, ...rsp.files] });
        } else {
          this.setState({files: rsp.files });
        }
        this.setState({ lastPage: rsp.paging.page });
        if (rsp.paging.page < rsp.paging.pages) {
          // this.fetchFiles(rsp.paging.page + 1);
        }
      })
      .catch(err => {
        setAccessToken();
      });
  }

  deleteFiles() {
    const { selectedItems } = this.state;
    for (const key of Object.keys(selectedItems)) {
      if (selectedItems[key]) {
        fetch(`https://slack.com/api/files.delete`,{
          method: 'POST',
          body: `token=${getAccessToken()}&file=${key}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }})
          .then(() => {
            delete selectedItems[key];
            this.setState({ files: this.state.files.filter(file => file.id)});
          });
      }
    }
  }

  render() {
    const { files, selectedItems } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <p>
            <img src={logo} className="App-logo" alt="logo" />
            Slack File Manager
          </p>
        </header>
        <List className="FileList">
          {files.map((file: SlackFile, num: number) => (
          <ListItem key={file.id} button onClick={() => {
            this.setState({ selectedItems: { ...selectedItems, [file.id]: !selectedItems[file.id]}});
          }}>
            <Checkbox
                checked={selectedItems[file.id] ? true : false}
                tabIndex={-1}
            />
            <UserInfo userId={file.user} />
            <ListItemText primary={<a href={file.permalink}>{file.name}</a>} secondary={new Date(file.timestamp*1000).toDateString()} />
            <ListItemSecondaryAction>
              {this.renderPreview(file)}
            </ListItemSecondaryAction>
          </ListItem>
          ))}
        </List>

        <Button action={() => {
          this.fetchFiles(this.state.lastPage + 1);
        }}>Load More...</Button>
      </div>
    );
  }

  private renderPreview(file: SlackFile) {
    if (/^image/.test(file.mimetype)) {
      return (
        <Tooltip
            placement="left"
            title={
              <React.Fragment>
                <div className="image-large">
                  <img className="image-large" src={file.url_private} />
                </div>
              </React.Fragment>
            }
        >
          <img className="thumbnail" src={file.url_private} />
        </Tooltip>
      );
    }
    return null;
  }
}

interface UserInfoProps {
  userId: string;
}

interface UserInfoState {
  user?: SlackUser;
}

class UserInfo extends React.Component<UserInfoProps, UserInfoState> {
  state: UserInfoState = {};
  arrowRef?: any;

  componentWillMount(): void {
    const user = userCache[this.props.userId];
    if (!user) {
      fetch(`https://slack.com/api/users.info?token=${getAccessToken()}&user=${this.props.userId}`)
          .then(res => res.json())
          .then(rsp => {
            if (!rsp.ok) {
              throw new Error('Invalid request');
            }
            this.setState({user: userCache[rsp.user.id] = rsp.user});
          });
    }
  }

  render() {
    const { user } = this.state;
    if (!user) return null;
    return (
        <Avatar>
          <Tooltip
              placement="right"
              title={
                <React.Fragment>
                  {user.profile.display_name}
                </React.Fragment>
              }
          >
            <img src={user.profile.image_48} alt={user.profile.display_name} />
          </Tooltip>
        </Avatar>
    );
  }
}

export default App;
