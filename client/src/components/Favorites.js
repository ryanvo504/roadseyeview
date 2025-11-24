import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

const Favorites = forwardRef(({ favorites, onLoad, onDelete }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
    scrollIntoView: (options) => containerRef.current?.scrollIntoView(options)
  }));

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-200">
          Favorites
          <span className="ml-2 text-sm text-gray-400">({favorites.length})</span>
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-400 text-sm hover:text-blue-300"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {favorites.map(favorite => (
            <div
              key={favorite.id}
              onClick={() => onLoad(favorite)}
              className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-200">{favorite.name}</h3>
                  {favorite.type === 'location' ? (
                    <p className="text-xs text-gray-400 mt-1 truncate" title={favorite.address}>
                      {favorite.address}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 mt-1 truncate" title={favorite.originAddress}>
                        <span className="font-semibold text-gray-300">From:</span> {favorite.originAddress || `${favorite.start.lat.toFixed(4)}, ${favorite.start.lng.toFixed(4)}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate" title={favorite.destinationAddress}>
                        <span className="font-semibold text-gray-300">To:</span> {favorite.destinationAddress || `${favorite.end.lat.toFixed(4)}, ${favorite.end.lng.toFixed(4)}`}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${favorite.name}"?`)) {
                      onDelete(favorite.id);
                    }
                  }}
                  className="flex-shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default Favorites;
