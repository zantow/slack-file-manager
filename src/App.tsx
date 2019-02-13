import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import { Tooltip } from './Tooltip';
import { ListItemSecondaryAction } from '@material-ui/core';
import Fab from '@material-ui/core/Fab';
import { AudioPlayer } from './AudioPlayer';
import { InlineDatePicker } from 'material-ui-pickers';
import Launch from '@material-ui/icons/Launch';
import {
  authorize,
  get,
  getAccessToken,
  post,
  SlackChannel,
  SlackFile,
  SlackPin,
  SlackUser,
} from './SlackApi';
import { ErrorDisplay } from './ErrorDisplay';
import { UserSelector } from './UserSelector';
import { UserInfo } from './UserInfo';
import { AutoScroll } from './AutoScroll';

const perPage = 20;

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

export class App extends Component<AppProps, AppState> {
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
    } else {
      // no pages left
      if (this.state.lastPage >= this.state.totalPages) {
        return Promise.resolve();
      }
    }
    this.setState({ loading: true });
    return get('files.list', {
      page,
      count: perPage,
      ts_to: selectedDate && selectedDate.getTime() / 1000,
      user: selectedUser && selectedUser.id,
    }).then(rsp => {
      let files: SlackFile[];
      if (rsp.paging && rsp.paging.page > 1) {
        files = [...this.state.files, ...rsp.files];
      } else {
        files = rsp.files;
      }
      this.setState({
        files,
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
        <ErrorDisplay>
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <span>Slack File Manager</span>
          </header>
          <div className="FilterPanel">
            <ListItem>
              <Checkbox
                checked={this.hasSelectedItems()}
                disabled={!this.hasSelectedItems() && !this.state.selectedUser}
                onChange={e => this.selectAll(e.target.checked)}
              />
              <UserSelector
                userId={this.state.selectedUser ? this.state.selectedUser.id : ''}
                onSelect={u => this.setState({ selectedUser: u }, () => this.fetchFiles())}
              />
              <InlineDatePicker
                label="Before"
                value={selectedDate}
                onChange={dt => this.setState({ selectedDate: dt }, () => this.fetchFiles())}
              />
            </ListItem>
          </div>
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
          <List className="FileList">
            <AutoScroll onLoad={() => this.fetchFiles(this.state.lastPage + 1)}>
              {files.map((file: SlackFile) => (
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
        </ErrorDisplay>
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
