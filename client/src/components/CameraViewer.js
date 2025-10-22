import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

function CameraViewer({ camera, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset states when camera changes
    setError(false);
    setLoading(true);

    if (!camera.streamUrl) {
      setLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setLoading(false);
      return;
    }

    console.log('Loading stream:', camera.streamUrl);

    // Check if browser supports HLS natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Using native HLS support');
      video.src = camera.streamUrl;

      const handleCanPlay = () => {
        console.log('Video can play');
        setLoading(false);
        video.play().catch(err => {
          console.error('Error auto-playing:', err);
        });
      };

      const handleError = (e) => {
        console.error('Video element error:', e);
        setError(true);
        setLoading(false);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
    // Use HLS.js for other browsers
    else if (Hls.isSupported()) {
      console.log('Using HLS.js');
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        liveBackBufferLength: 0,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        backBufferLength: 0,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveDurationInfinity: true,
        xhrSetup: function(xhr, url) {
          // Add cache-busting headers and timestamp
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          xhr.setRequestHeader('Pragma', 'no-cache');
        }
      });
      hlsRef.current = hls;

      // Add timestamp to prevent caching
      const urlWithTimestamp = camera.streamUrl + (camera.streamUrl.includes('?') ? '&' : '?') + '_=' + Date.now();
      hls.loadSource(urlWithTimestamp);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setLoading(false);
        video.play().catch(err => {
          console.error('Error auto-playing video:', err);
          // Autoplay might be blocked, but video is ready
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data.type, data.details, data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Check if it's a 404 or other error
              if (data.response && data.response.code === 404) {
                console.error('Stream not found (404) - camera offline');
                setError(true);
                setLoading(false);
              } else {
                console.error('Fatal network error, trying to recover once');
                // Try to recover once
                hls.startLoad();
                setTimeout(() => {
                  setError(true);
                  setLoading(false);
                }, 5000);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover');
              hls.recoverMediaError();
              setTimeout(() => {
                setError(true);
                setLoading(false);
              }, 5000);
              break;
            default:
              console.error('Unrecoverable error');
              setError(true);
              setLoading(false);
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else {
      console.error('HLS is not supported in this browser');
      setError(true);
      setLoading(false);
    }
  }, [camera.streamUrl]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{camera.name}</h2>
            <p className="text-sm text-gray-600">
              {camera.route} - {camera.direction}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Video/Image Content */}
        <div className="p-4">
          {camera.streamUrl ? (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                controls
                autoPlay
                muted
                playsInline
                className="w-full h-full"
              />
              {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Loading stream...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                  <div className="text-white text-center p-4 max-w-md">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-semibold mb-2">Stream Unavailable</p>
                    <p className="text-sm text-gray-300 mb-4">
                      This camera's live stream is currently offline or the stream URL has changed.
                      Traffic camera streams are maintained by CalTrans and may go offline periodically.
                    </p>
                    {camera.imageUrl && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 mb-2">Showing latest still image instead:</p>
                        <img
                          src={camera.imageUrl}
                          alt={camera.name}
                          className="w-full mx-auto rounded border-2 border-gray-600"
                          onError={(e) => {
                            e.target.parentElement.innerHTML = '<p class="text-red-400 text-sm">No image available</p>';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : camera.imageUrl ? (
            <div className="relative">
              <img
                src={camera.imageUrl}
                alt={camera.name}
                className="w-full rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
              <p className="text-center text-sm text-gray-600 mt-2">
                Still image only - No video stream available
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-500">
              No video or image available for this camera
            </div>
          )}

          {/* Camera Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Camera Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Location:</span>
                <p className="font-medium">{camera.nearbyPlace || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">County:</span>
                <p className="font-medium">{camera.county || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Coordinates:</span>
                <p className="font-medium">
                  {camera.latitude.toFixed(5)}, {camera.longitude.toFixed(5)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Elevation:</span>
                <p className="font-medium">{camera.elevation}m</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {camera.streamUrl && (
              <a
                href={camera.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center text-sm"
              >
                Open Stream in New Tab
              </a>
            )}
            {camera.imageUrl && (
              <a
                href={camera.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center text-sm"
              >
                Open Image in New Tab
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraViewer;
