'use client';

import Dropzone from 'react-dropzone';

export default function FileUploader() {
  return (
    <Dropzone>
      {({ getRootProps, getInputProps, acceptedFiles }) => {
        return (
          <div className="container">
            <div {...getRootProps({ className: 'dropzone' })}>
              <input {...getInputProps()} />
              <p>Drag and drop some files here</p>
            </div>
            <aside>
              <h4>Files</h4>
              <ul>
                {acceptedFiles.map((file) => (
                  <li key={file.path}>
                    {file.path} - {file.size} bytes
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        );
      }}
    </Dropzone>
  );
}
