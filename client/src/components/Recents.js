import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

const Recents = forwardRef(({ recents, onLoad, onDelete, onClearAll }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
    scrollIntoView: (options) => containerRef.current?.scrollIntoView(options)
  }));

  if (recents.length === 0) {
    return null;
  }

  const formatTimeAgo = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={containerRef} className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-200">
          Recents
          <span className="ml-2 text-sm text-gray-400">({recents.length})</span>
        </h2>
        <div className="flex gap-2">
          {expanded && recents.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all recents?')) {
                  onClearAll();
                }
              }}
              className="text-red-400 text-xs hover:text-red-300"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2">
          {recents.map(recent => (
            <div
              key={recent.id}
              onClick={() => onLoad(recent)}
              className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {formatTimeAgo(recent.searchedAt)}
                  </p>
                  {recent.type === 'location' ? (
                    <>
                      {recent.name && (
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {recent.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 truncate" title={recent.address}>
                        {recent.address}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 mt-1 truncate" title={recent.originAddress}>
                        <span className="font-semibold text-gray-300">From:</span> {recent.originAddress}
                      </p>
                      <p className="text-xs text-gray-400 truncate" title={recent.destinationAddress}>
                        <span className="font-semibold text-gray-300">To:</span> {recent.destinationAddress}
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(recent.id);
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

export default Recents;
