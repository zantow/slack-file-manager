import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const clientId = '60448998578.533653717520';
const clientSecret = '3bad701c22c6ed3770101b786bff03a6';
const scopes = 'users:read,files:read,files:write:user';
const perPage = 20;

const url = true ? 'http://localhost:3000/' : 'https://slack-file-manager.herokuapp.com/';

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

const userCache: any = {};

class App extends Component<any, any> {
  state: any = { selectedItems: {} };

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
          this.setState({fileList: [...this.state.fileList, ...rsp.files] });
        } else {
          this.setState({fileList: rsp.files });
        }
        if (rsp.paging.page < rsp.paging.pages) {
          // this.fetchFiles(rsp.paging.page + 1);
        }
      })
      .catch(err => {
        setAccessToken();
      });
  }

  deleteFiles() {
    // files.delete
    // POST /api/conversations.create
    // Content-type: application/x-www-form-urlencoded
    // token=xoxp-xxxxxxxxx-xxxx&name=something-urgent
    fetch(`https://slack.com/api/files.list?token=${getAccessToken()}`,
      { method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }})
  }

  render() {
    const { fileList, selectedItems } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <p>
            <img src={logo} className="App-logo" alt="logo" />
            Slack File Manager
          </p>
        </header>
        {fileList && (
          <table className="FileList">
            <tbody>
            {fileList.map((file: any, num: number) => (
              <tr key={file.id}>
                <td>
                  {num}
                </td>
                <td>
                  {!file.is_external && (
                    <input type="checkbox" checked={selectedItems[file.id]} onChange={e => {
                      selectedItems[file.id] = e.target.checked;
                      this.forceUpdate();
                    }} />
                  )}
                </td>
                <td>
                  <a href={file.permalink}>{file.name}</a>
                </td>
                <td>
                  {new Date(file.timestamp*1000).toDateString()}
                </td>
                <td>
                  <UserInfo userId={file.user} />
                </td>
                <td>
                  {/^image/.test(file.mimetype) &&
                      <img src={file.url_private} />
                  }
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
}

class UserInfo extends React.Component<any, any> {
  state: any = {};

  componentWillMount(): void {
    fetch(`https://slack.com/api/users.info?token=${getAccessToken()}&user=${this.props.userId}`)
      .then(res =>  res.json())
      .then(rsp => {
        if (!rsp.ok) {
          throw new Error('Invalid request');
        }
        this.setState({user: rsp.user });
      });
  }

  render() {
    const { user } = this.state;
    return (
      <span>
        {user && user.name}
      </span>
    );
  }
}

export default App;
