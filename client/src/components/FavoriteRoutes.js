import React, { useState } from 'react';

function FavoriteRoutes({ favorites, onLoad, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          Favorite Routes
          <span className="ml-2 text-sm text-gray-600">({favorites.length})</span>
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-500 text-sm hover:text-blue-600"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {favorites.map(favorite => (
            <div
              key={favorite.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{favorite.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {favorite.start.lat.toFixed(4)}, {favorite.start.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {favorite.end.lat.toFixed(4)}, {favorite.end.lng.toFixed(4)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => onLoad(favorite)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${favorite.name}"?`)) {
                        onDelete(favorite.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoriteRoutes;
