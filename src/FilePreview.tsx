import React from 'react';
import { Tooltip } from './Tooltip';
import { AudioPlayer } from './AudioPlayer';
import { SlackFile } from './SlackApi';

export const FilePreview = ({ file }: { file: SlackFile }) => {
  if (/^image/.test(file.mimetype)) {
    return (
      <Tooltip
        placement="left"
        title={
          <React.Fragment>
            <div className="image-large" style={{ opacity: 1 }}>
              <img className="image-large" src={file.url_private} alt={file.name} />
            </div>
          </React.Fragment>
        }
      >
        <img className="thumbnail" src={file.url_private} alt={file.name} />
      </Tooltip>
    );
  }
  if (/^audio/.test(file.mimetype)) {
    return <AudioPlayer audioFileUrl={file.url_private} />;
  }
  return null;
};
