import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import { Tooltip } from './Tooltip';
import { ListItemSecondaryAction } from '@material-ui/core';
import Fab from '@material-ui/core/Fab';
import { AudioPlayer } from './AudioPlayer';
import { InlineDatePicker } from 'material-ui-pickers';
import Launch from '@material-ui/icons/Launch';
import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormHelperText from '@material-ui/core/FormHelperText';
import Snackbar from '@material-ui/core/Snackbar';
import { AutoScroll } from './AutoScroll';
import FormGroup from '@material-ui/core/FormGroup';

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,pins:read,channels:read,files:read,files:write:user';
const perPage = 20;

const url = `${window.location.protocol}//${window.location.host}/`;

let apiError: string | null = null;

interface SlackApiParams {
  [key: string]: string | number | boolean | undefined;
}

function get(path: string, params: SlackApiParams = {}) {
  return slackApiFetch(path, params);
}

function post(path: string, params: SlackApiParams) {
  return slackApiFetch(path, params, 'POST');
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

  return fetch(`https://slack.com/api/${path}?token=${getAccessToken()}${query}`, opts)
    .then(res => res.json())
    .then(rsp => {
      if (!rsp.ok) {
        if (rsp.error === 'missing_scope') {
          setAccessToken();
        }
        throw new Error('Invalid request');
      }
      return rsp;
    })
    .catch(err => {
      apiError = err;
      console.error(err);
    });
}

/**
 * Authorize or redirect for authorization
 */
function authorize() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    window.location.assign(
      `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${url}`
    );
  } else {
    fetch(
      `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${url}`
    )
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
  token
    ? window.localStorage.setItem('accessToken', token)
    : window.localStorage.removeItem('accessToken');
}

interface SlackUser {
  id: string;
  name: string;
  profile: {
    display_name: string;
    image_24: string;
    image_48: string;
  };
}

interface SlackChannel {
  id: string;
  name: string;
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

interface SlackMessage {
  files?: SlackFile[];
}

interface SlackPin {
  message?: SlackMessage;
  file?: SlackFile;
}

const userCache: { [key: string]: SlackUser } = {};

interface AppProps {}

interface AppState {
  files: SlackFile[];
  pins: SlackPin[];
  selectedItems: { [key: string]: boolean };
  loading: boolean;
  lastPage: number;
  totalPages: number;
  selectedDate?: Date;
  selectedUser?: SlackUser;
}

class App extends Component<AppProps, AppState> {
  state: AppState = {
    files: [],
    pins: [],
    selectedItems: {},
    loading: false,
    lastPage: 0,
    totalPages: 0,
  };

  componentWillMount(): void {
    if (!getAccessToken()) {
      authorize();
    } else {
      this.fetchPins();
      this.fetchFiles();
    }
  }

  fetchFiles(page = 1) {
    const { selectedDate, selectedUser } = this.state;
    if (page === 1) {
      // Reset selections for new searches
      this.setState({ selectedItems: {} });
    }
    this.setState({ loading: true });
    return get('files.list', {
      page,
      count: perPage,
      ts_to: selectedDate && selectedDate.getTime() / 1000,
      user: selectedUser && selectedUser.id,
    }).then(rsp => {
      if (rsp.paging && rsp.paging.page > 1) {
        this.setState({ files: [...this.state.files, ...rsp.files] });
      } else {
        this.setState({ files: rsp.files });
      }
      this.setState({
        lastPage: rsp.paging.page,
        loading: false,
        totalPages: rsp.paging.pages,
      });
    });
  }

  fetchPins() {
    get('channels.list', {
      exclude_archived: true,
      exclude_members: true,
    }).then(rsp => {
      for (const channel of rsp.channels as SlackChannel[]) {
        get('pins.list', { channel: channel.id }).then(rsp => {
          console.log('channel', channel.name, 'pins', rsp);
          this.setState({ pins: [...this.state.pins, ...rsp.items] });
        });
      }
    });
  }

  deleteFiles() {
    const { selectedItems } = this.state;
    for (const key of Object.keys(selectedItems)) {
      if (selectedItems[key]) {
        post('files.delete', {
          file: key,
        }).then(() => {
          delete selectedItems[key];
          this.setState({ files: this.state.files.filter(file => file.id !== key) });
        });
      }
    }
  }

  selectAll(select: boolean) {
    if (select) {
      const { selectedItems } = this.state;
      this.state.files.map(file => {
        if (!this.isPinned(file) && !file.is_external) {
          selectedItems[file.id] = true;
        }
      });
      this.setState({ selectedItems });
      if (this.state.lastPage < this.state.totalPages) {
        this.fetchFiles(this.state.lastPage + 1).then(() => this.selectAll(select));
      }
    } else {
      this.setState({ selectedItems: {} });
    }
  }

  hasSelectedItems() {
    return (
      Object.keys(this.state.selectedItems).filter(key => this.state.selectedItems[key]).length > 0
    );
  }

  render() {
    const { files, selectedItems, selectedDate } = this.state;
    return (
      <div className="App">
        {apiError && (
          <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            open={apiError !== null}
            ContentProps={{
              'aria-describedby': 'message-id',
            }}
            message={<span id="message-id">{JSON.stringify(apiError)}</span>}
          />
        )}
        <header className="App-header">
          <p>
            <img src={logo} className="App-logo" alt="logo" />
            Slack File Manager
          </p>
          <div className="FileActions">
            {this.selectedFiles() && (
              <Fab
                disabled={!this.selectedFiles()}
                color="secondary"
                variant="extended"
                onClick={() => {
                  this.deleteFiles();
                }}
              >
                Delete Selected
              </Fab>
            )}
          </div>
        </header>
        <div className="DateFilter">
          <FormGroup>
            <FormControl>
              <Checkbox
                checked={this.hasSelectedItems()}
                onChange={e => this.selectAll(e.target.checked)}
              />
              Select All
            </FormControl>
            <InlineDatePicker
              label="Before"
              value={selectedDate}
              onChange={dt => this.setState({ selectedDate: dt }, () => this.fetchFiles())}
            />
            <UserSelector
              userId={this.state.selectedUser && this.state.selectedUser.id}
              onSelect={u => this.setState({ selectedUser: u }, () => this.fetchFiles())}
            />
          </FormGroup>
        </div>
        <List className="FileList">
          <AutoScroll onLoad={() => this.fetchFiles(this.state.lastPage + 1)}>
            {files.map((file: SlackFile, num: number) => (
              <ListItem
                key={file.id}
                className="FileListItem"
                button
                disabled={this.isPinned(file) || file.is_external}
                onClick={() => {
                  this.setState({
                    selectedItems: {
                      ...selectedItems,
                      [file.id]: !selectedItems[file.id],
                    },
                  });
                }}
              >
                <Checkbox
                  checked={selectedItems[file.id] ? true : false}
                  tabIndex={-1}
                  disabled={this.isPinned(file)}
                />
                <UserInfo userId={file.user} />
                <ListItemText
                  primary={
                    <span>
                      {file.name}{' '}
                      <a className="ExternalLink" href={file.permalink} target="open-in-slack">
                        <Launch />
                      </a>
                    </span>
                  }
                  secondary={new Date(file.timestamp * 1000).toDateString()}
                />
                <ListItemSecondaryAction>
                  <div className="Preview">{this.renderPreview(file)}</div>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </AutoScroll>
        </List>

        {this.state.loading && (
          <Fab
            color="primary"
            variant="extended"
            disabled
            onClick={() => {
              this.fetchFiles(this.state.lastPage + 1);
            }}
          >
            Loading...
          </Fab>
        )}
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
      return <AudioPlayer audioFileUrl={file.url_private} />;
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

  private isPinned(file: SlackFile) {
    return (
      this.state.pins.filter(pin => {
        return (
          (pin.file && pin.file.id === file.id) ||
          (pin.message &&
            pin.message.files &&
            pin.message.files.filter(f => f.id === file.id).length > 0)
        );
      }).length > 0
    );
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
          this.setState({ user: userCache[rsp.user.id] = rsp.user });
        });
    } else {
      this.setState({ user });
    }
  }

  render() {
    const { user } = this.state;
    if (!user)
      return (
        <Avatar>
          <Tooltip placement="right" title={<React.Fragment>{this.props.userId}</React.Fragment>}>
            <span>{this.props.userId}</span>
          </Tooltip>
        </Avatar>
      );
    const userName = user.profile.display_name || user.name;
    const children = user.profile.image_48 ? (
      <img src={user.profile.image_48} alt={userName} />
    ) : (
      <span>{userName}</span>
    );
    return (
      <Avatar>
        <Tooltip placement="right" title={<React.Fragment>{userName}</React.Fragment>}>
          {children}
        </Tooltip>
      </Avatar>
    );
  }
}

interface UserSelectorProps {
  userId?: string;
  onSelect: (user?: SlackUser) => void;
}

interface UserSelectorState {
  users: SlackUser[];
}

class UserSelector extends React.Component<UserSelectorProps, UserSelectorState> {
  state: UserSelectorState = { users: [] };

  componentWillMount() {
    get('users.list').then(rsp => {
      this.setState({ users: rsp.members });
    });
  }

  render() {
    return (
      <FormControl>
        <Select
          value={this.props.userId}
          onChange={id =>
            id && this.props.onSelect(this.state.users.filter(u => u.id === id.target.value)[0])
          }
          name="age"
          displayEmpty
        >
          <MenuItem value="">All Users</MenuItem>
          {this.state.users
            .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name))
            .map(user => (
              <MenuItem key={user.id} value={user.id}>
                <Avatar>
                  <img src={user.profile.image_48} alt={user.profile.display_name} />
                </Avatar>
                {user.profile.display_name}
              </MenuItem>
            ))}
        </Select>
        <FormHelperText>Placeholder</FormHelperText>
      </FormControl>
    );
  }
}

export default App;
