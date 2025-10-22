import React, { useState } from 'react';

function CameraList({ cameras, onCameraSelect, selectedCamera, showAll }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showList, setShowList] = useState(true);

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.nearbyPlace?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-4">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />

          <div className="space-y-2 max-h-96 overflow-y-auto">
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
}

export default CameraList;
