import * as React from "react";

import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import PauseIcon from '@material-ui/icons/PauseCircleFilled';

// @ts-ignore import
import WaveSurfer from 'wavesurfer.js';
import {Ref} from "react";

interface Props {
    audioFileUrl: string;
}

interface State {
    playing: boolean;
    position: number;
    loaded: number;
}

export class AudioPlayer extends React.Component<Props, State> {
    state: State = { playing: false, position: 0, loaded: 0, };
    audio: HTMLAudioElement | null = null;

    // componentDidMount(): void {
    //     const wavesurfer = WaveSurfer.create({
    //         container: '#waveform',
    //         waveColor: 'violet',
    //         progressColor: 'purple'
    //     });
    //     wavesurfer.on('ready', function () {
    //         wavesurfer.play();
    //     });
    //     wavesurfer.load(this.props.audioFileUrl);
    // }

    render() {
        const { playing, position } = this.state;
        return (
            <div className="AudioPlayer">
                <audio autoPlay={false} controls={false} preload={'none'}
                       onTimeUpdate={() => this.updatePercentages()}
                       ref={r => this.audio = r}>
                    <source src={this.props.audioFileUrl} />
                </audio>
                <div className="PlayControl" style={{position: 'relative'}}>
                    {position > 0 && (
                        <div className="PlayPercentage">
                            <svg viewBox="0 0 42 42">
                                <circle className="PlayPercentageValue" r="39%" cx="50%" cy="50%" style={{
                                    strokeDasharray: `${110 * position}, 100`,
                                }} />
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
        this.setState({playing: true});
    }

    private stopAudio() {
        this.audio!.pause();
        this.setState({playing: false});
    }

    private updatePercentages() {
        const { audio } = this;
        // loaded = 100 * buffered.end(0) / audio.duration;
        this.setState({ position: audio!.currentTime / audio!.duration});
    }
}

//
// <!doctype html>
// <html lang="en">
// <head>
//     <meta charset="utf-8">
//         <meta name="viewport" content="user-scalable=no">
//             <title>Howler.js Audio Player</title>
//             <link rel="stylesheet" href="./styles.css">
// </head>
// <body>
// <!-- Top Info -->
// <div id="title">
//     <span id="track"></span>
//     <div id="timer">0:00</div>
//     <div id="duration">0:00</div>
// </div>
//
// <!-- Controls -->
// <div class="controlsOuter">
//     <div class="controlsInner">
//         <div id="loading"></div>
//         <div class="btn" id="playBtn"></div>
//         <div class="btn" id="pauseBtn"></div>
//         <div class="btn" id="prevBtn"></div>
//         <div class="btn" id="nextBtn"></div>
//     </div>
//     <div class="btn" id="playlistBtn"></div>
//     <div class="btn" id="volumeBtn"></div>
// </div>
//
// <!-- Progress -->
// <div id="waveform"></div>
// <div id="bar"></div>
// <div id="progress"></div>
//
// <!-- Playlist -->
// <div id="playlist">
//     <div id="list"></div>
// </div>
//
// <!-- Volume -->
// <div id="volume" class="fadeout">
//     <div id="barFull" class="bar"></div>
//     <div id="barEmpty" class="bar"></div>
//     <div id="sliderBtn"></div>
// </div>
//
// <!-- Scripts -->
// <script src="../../src/howler.core.js"></script>
// <script src="./siriwave.js"></script>
// <script src="./player.js"></script>
// </body>
// </html>