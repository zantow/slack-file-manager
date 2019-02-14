import * as React from 'react';

import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import PauseIcon from '@material-ui/icons/PauseCircleFilled';

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
      <div
        className="AudioPlayer"
        onWheel={e => {
          this.setAudioPosition(e.deltaY);
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <audio
          autoPlay={false}
          controls={false}
          preload={'none'}
          onTimeUpdate={() => this.updatePercentages()}
          onPlay={() => this.onPlay()}
          onPause={() => this.onPause()}
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
                  r="35%"
                  cx="50%"
                  cy="50%"
                  style={{
                    strokeDasharray: `${92 * position}, 100`,
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
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
    });
    this.audio!.play().catch(err => {
      console.error(err);
    });
  }

  private stopAudio() {
    this.audio!.pause();
  }

  private updatePercentages() {
    const { audio } = this;
    // loaded = 100 * buffered.end(0) / audio.duration;
    this.setState({ position: audio!.currentTime / audio!.duration });
  }

  private setAudioPosition(deltaY: number) {
    const { audio } = this;
    audio!.currentTime += deltaY > 0 ? -1 : 1;
    this.updatePercentages();
  }

  private onPlay() {
    this.setState({ playing: true });
  }

  private onPause() {
    this.setState({ playing: false });
  }
}
