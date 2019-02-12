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
import Fab from "@material-ui/core/Fab";
import {AudioPlayer} from "./AudioPlayer";
import {InlineDatePicker} from "material-ui-pickers";

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,files:read,files:write:user';
const perPage = 20;

const url = `${window.location.protocol}//${window.location.host}/`;

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
  url_private_download: string;
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
  selectedDate?: Date;
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
    const { selectedDate } = this.state;
    // could list based on timestamp using: ts_to=${timestamp}
    const dateFilter = selectedDate ? `&ts_to=${selectedDate.getTime() / 1000}` : '';
    fetch(`https://slack.com/api/files.list?token=${getAccessToken()}&count=${perPage}&page=${page}${dateFilter}`)
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
            this.setState({ files: this.state.files.filter(file => file.id !== key)});
          });
      }
    }
  }

  render() {
    const { files, selectedItems, selectedDate } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <p>
            <img src={logo} className="App-logo" alt="logo" />
            Slack File Manager
          </p>
            <div className="FileActions">
            {this.selectedFiles() && <Fab disabled={!this.selectedFiles()} color="secondary" variant="extended" onClick={() => {
                this.deleteFiles();
            }}>Delete Selected</Fab>}
            </div>
            <div className="DateFilter">
                <InlineDatePicker
                    label="Before"
                    value={selectedDate}
                    onChange={dt => this.setState({selectedDate: dt}, () => this.fetchFiles())}
                />
            </div>
        </header>
        <List className="FileList">
          {files.map((file: SlackFile, num: number) => (
          <ListItem key={file.id} button disabled={file.is_external} onClick={() => {
            this.setState({ selectedItems: { ...selectedItems, [file.id]: !selectedItems[file.id]}});
          }}>
            <Checkbox
                checked={selectedItems[file.id] ? true : false}
                tabIndex={-1}
                disabled={file.is_external}
            />
            <UserInfo userId={file.user} />
            <ListItemText primary={file.name} secondary={new Date(file.timestamp*1000).toDateString()} />
            <ListItemSecondaryAction>
              <div className="Preview">
                {this.renderPreview(file)}
              </div>
            </ListItemSecondaryAction>
          </ListItem>
          ))}
        </List>

        <Fab color="default" variant="extended" onClick={() => {
          this.fetchFiles(this.state.lastPage + 1);
        }}>Load More...</Fab>
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
      if (/^audio/.test(file.mimetype)) {
          return <AudioPlayer audioFileUrl={file.url_private}/>
      }
    return null;
  }

    private selectedFiles() {
        const { selectedItems } = this.state;
        for (const key of Object.keys(selectedItems)) {
            if (selectedItems[key]) {
                return true;
            }
        }
        return false;
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
    } else {
        this.setState({user});
    }
  }

  render() {
    const { user } = this.state;
    if (!user) return <Avatar>
        <Tooltip
            placement="right"
            title={
                <React.Fragment>
                    {this.props.userId}
                </React.Fragment>
            }
        >
            <span>{this.props.userId}</span>
        </Tooltip>
    </Avatar>;
    const userName = user.profile.display_name || user.name;
    const children = user.profile.image_48 ? <img src={user.profile.image_48} alt={userName} /> : <span>{userName}</span>;
    return (
        <Avatar>
          <Tooltip
              placement="right"
              title={
                <React.Fragment>
                  {userName}
                </React.Fragment>
              }
          >
              {children}
          </Tooltip>
        </Avatar>
    );
  }
}

export default App;
