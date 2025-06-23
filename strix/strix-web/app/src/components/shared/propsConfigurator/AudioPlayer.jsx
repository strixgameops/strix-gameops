import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import WaveSurfer from 'wavesurfer.js';
import styled from 'styled-components';
import { FaPlayCircle, FaPauseCircle } from 'react-icons/fa';


import PlayArrowSharpIcon from '@mui/icons-material/PlayArrowSharp';
import PauseSharpIcon from '@mui/icons-material/PauseSharp';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import s from './AudioPlayer.module.css';

const AudioPlayer = ({ audio }) => {
  const containerRef = useRef();
  const waveSurferRef = useRef({
    isPlaying: () => false,
  });
  const [isPlaying, toggleIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const waveSurfer = WaveSurfer.create({
      container: containerRef.current,
      responsive: true,
      barWidth: 1,
      barHeight: 0.6,
      cursorWidth: 0,
      height: 100,
      width: 250,
    });
    waveSurfer.load(audio);
    waveSurfer.on('ready', () => {
        waveSurferRef.current = waveSurfer;
        setIsReady(true);
    });

    return () => {
      waveSurfer.destroy();
    };
  }, [audio]);

  return (
    <WaveSurferWrap>
        {isReady ? (
            <div style={{display: 'flex', alignItems: 'center'}}>
                <IconButton
                  onClick={() => {
                    waveSurferRef.current.playPause();
                    toggleIsPlaying(waveSurferRef.current.isPlaying());
                  }}
                >
                  {isPlaying ? <PauseSharpIcon size="2em" /> : <PlayArrowSharpIcon size="2em" />}
                </IconButton>
            </div>
        ) : (
            <CircularProgress />
        )}
        <div ref={containerRef} className={s.waveformContainer} />
    </WaveSurferWrap>
  );
};

AudioPlayer.propTypes = {
  audio: PropTypes.string.isRequired,
};

const WaveSurferWrap = styled.div`
  display: flex;
  align-items: center;

  button {
    width: 40px;
    height: 40px;
    border: none;
    padding: 0;
    background-color: "#e7e7e7";
  }
`;


export default AudioPlayer;