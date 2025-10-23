import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

const CameraList = forwardRef(({ cameras, onCameraSelect, selectedCamera, showAll, showStreamsOnly, onShowStreamsOnlyChange }, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showList, setShowList] = useState(true);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    expand: () => setShowList(true),
    collapse: () => setShowList(false),
    scrollIntoView: (options) => containerRef.current?.scrollIntoView(options)
  }));

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.nearbyPlace?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          {showAll ? 'All Cameras' : 'Cameras Along Route'}
          <span className="ml-2 text-sm text-gray-600">({filteredCameras.length})</span>
        </h2>
        <button
          onClick={() => setShowList(!showList)}
          className="text-blue-500 text-sm hover:text-blue-600"
        >
          {showList ? 'Hide' : 'Show'}
        </button>
      </div>

      {showList && (
        <>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cameras..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showStreamsOnly}
              onChange={(e) => onShowStreamsOnlyChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              Show video streams only
              <svg className="w-4 h-4 inline ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </span>
          </label>

          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredCameras.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No cameras found
              </p>
            ) : (
              filteredCameras.map(camera => (
                <div
                  key={camera.id}
                  onClick={() => onCameraSelect(camera)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCamera?.id === camera.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {camera.imageUrl && (
                      <img
                        src={camera.imageUrl}
                        alt={camera.name}
                        className="w-20 h-14 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {camera.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {camera.route} - {camera.direction}
                      </p>
                      {camera.nearbyPlace && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Near {camera.nearbyPlace}
                        </p>
                      )}
                      {!camera.streamUrl && (
                        <p className="text-xs text-orange-600 mt-1">
                          (Image only - no stream)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default CameraList;
