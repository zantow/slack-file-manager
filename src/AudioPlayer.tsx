import * as React from 'react';

import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import PauseIcon from '@material-ui/icons/PauseCircleFilled';

// @ts-ignore import
import WaveSurfer from 'wavesurfer.js';
import { Ref } from 'react';

interface Props {
  audioFileUrl: string;
}

interface State {
  playing: boolean;
  position: number;
  loaded: number;
}

export class AudioPlayer extends React.Component<Props, State> {
  state: State = { playing: false, position: 0, loaded: 0 };
  audio: HTMLAudioElement | null = null;

  render() {
    const { playing, position } = this.state;
    return (
      <div className="AudioPlayer">
        <audio
          autoPlay={false}
          controls={false}
          preload={'none'}
          onTimeUpdate={() => this.updatePercentages()}
          ref={r => (this.audio = r)}
        >
          <source src={this.props.audioFileUrl} />
        </audio>
        <div className="PlayControl" style={{ position: 'relative' }}>
          {position > 0 && (
            <div className="PlayPercentage">
              <svg viewBox="0 0 42 42">
                <circle
                  className="PlayPercentageValue"
                  r="39%"
                  cx="50%"
                  cy="50%"
                  style={{
                    strokeDasharray: `${110 * position}, 100`,
                  }}
                />
              </svg>
            </div>
          )}
          {!playing && <PlayIcon className="TransportButton" onClick={() => this.playAudio()} />}
          {playing && <PauseIcon className="TransportButton" onClick={() => this.stopAudio()} />}
        </div>
      </div>
    );
  }

  private playAudio() {
    this.audio!.play();
    this.setState({ playing: true });
  }

  private stopAudio() {
    this.audio!.pause();
    this.setState({ playing: false });
  }

  private updatePercentages() {
    const { audio } = this;
    // loaded = 100 * buffered.end(0) / audio.duration;
    this.setState({ position: audio!.currentTime / audio!.duration });
  }
}
