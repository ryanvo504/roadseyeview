import React, { useState, useRef, useEffect } from 'react';

function MapSearch({ onLocationSelect, onRouteSubmit, route, routeCameras, onClearRoute, onSaveFavoriteRoute, onSaveFavoriteLocation, currentRouteInfo, loadedRouteAddresses, loadedLocation, searchedLocation }) {
  // Route mode state
  const [isRouteMode, setIsRouteMode] = useState(false);

  // Single location search state
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [lastSelectedLocation, setLastSelectedLocation] = useState(null); // Store last searched location

  // Route search state
  const [originTerm, setOriginTerm] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [loadingOriginSuggestions, setLoadingOriginSuggestions] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState(null);

  const [destTerm, setDestTerm] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [loadingDestSuggestions, setLoadingDestSuggestions] = useState(false);
  const [selectedDest, setSelectedDest] = useState(null);

  const searchRef = useRef(null);
  const debounceTimeout = useRef(null);
  const originDebounceTimeout = useRef(null);
  const destDebounceTimeout = useRef(null);

  // Fetch address suggestions from Nominatim (California only)
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      setLoadingSuggestions(true);
      // Add California to the search query and use countrycodes to limit to US
      const searchQuery = `${query}, California`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=10&addressdetails=1&countrycodes=us`
      );
      const data = await response.json();

      // Filter to only California results
      const californiaResults = data.filter(result => {
        const state = result.address?.state;
        return state && (state.toLowerCase() === 'california' || state.toLowerCase() === 'ca');
      });

      setLoadingSuggestions(false);
      return californiaResults.slice(0, 5); // Return top 5 California results
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setLoadingSuggestions(false);
      return [];
    }
  };

  // Debounced handler for search input (single location mode)
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setSuggestions([]); // Clear old suggestions immediately
    setShowSuggestions(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Don't show suggestions if input is too short
    if (!value || value.length < 3) {
      setShowSuggestions(false);
      return;
    }

    debounceTimeout.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
    }, 300);
  };

  // Debounced handler for origin search
  const handleOriginChange = (value) => {
    setOriginTerm(value);
    setOriginSuggestions([]);
    setShowOriginSuggestions(true);
    setSelectedOrigin(null);

    if (originDebounceTimeout.current) {
      clearTimeout(originDebounceTimeout.current);
    }

    if (!value || value.length < 3) {
      setShowOriginSuggestions(false);
      return;
    }

    setLoadingOriginSuggestions(true);
    originDebounceTimeout.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setOriginSuggestions(results);
      setLoadingOriginSuggestions(false);
    }, 300);
  };

  // Debounced handler for destination search
  const handleDestChange = (value) => {
    setDestTerm(value);
    setDestSuggestions([]);
    setShowDestSuggestions(true);
    setSelectedDest(null);

    if (destDebounceTimeout.current) {
      clearTimeout(destDebounceTimeout.current);
    }

    if (!value || value.length < 3) {
      setShowDestSuggestions(false);
      return;
    }

    setLoadingDestSuggestions(true);
    destDebounceTimeout.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setDestSuggestions(results);
      setLoadingDestSuggestions(false);
    }, 300);
  };

  // Select a suggestion (single location mode)
  const selectSuggestion = (suggestion) => {
    setSearchTerm(suggestion.display_name);
    const coords = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    // Store the selected location for potential use as route origin
    setLastSelectedLocation({
      coords,
      address: suggestion.display_name
    });
    setShowSuggestions(false);
    setSuggestions([]);
    onLocationSelect(coords, suggestion.display_name);
  };

  // Select origin suggestion
  const selectOriginSuggestion = (suggestion) => {
    setOriginTerm(suggestion.display_name);
    const coords = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    setSelectedOrigin({ coords, address: suggestion.display_name });
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
  };

  // Select destination suggestion
  const selectDestSuggestion = (suggestion) => {
    setDestTerm(suggestion.display_name);
    const coords = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    setSelectedDest({ coords, address: suggestion.display_name });
    setShowDestSuggestions(false);
    setDestSuggestions([]);
  };

  // Handle loaded location (from favorites/recents)
  useEffect(() => {
    if (loadedLocation) {
      // Switch to single location mode
      setIsRouteMode(false);

      // Populate search term
      setSearchTerm(loadedLocation.address);

      // Store the loaded location so it can be used as route origin if needed
      setLastSelectedLocation({
        coords: loadedLocation.coords,
        address: loadedLocation.address
      });

      // Clear route-related state
      setOriginTerm('');
      setDestTerm('');
      setOriginSuggestions([]);
      setDestSuggestions([]);
      setSelectedOrigin(null);
      setSelectedDest(null);
      setShowOriginSuggestions(false);
      setShowDestSuggestions(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [loadedLocation]);

  // Handle loaded route addresses (from favorites/recents)
  useEffect(() => {
    if (loadedRouteAddresses) {
      // Switch to route mode
      setIsRouteMode(true);

      // Populate origin
      if (loadedRouteAddresses.origin) {
        setOriginTerm(loadedRouteAddresses.origin.address);
        setSelectedOrigin(loadedRouteAddresses.origin);
      }

      // Populate destination
      if (loadedRouteAddresses.destination) {
        setDestTerm(loadedRouteAddresses.destination.address);
        setSelectedDest(loadedRouteAddresses.destination);
      }

      // Clear single location search
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [loadedRouteAddresses]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowOriginSuggestions(false);
        setShowDestSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    // Clear last selected location when search is cleared
    setLastSelectedLocation(null);
  };

  const handleOriginClear = () => {
    setOriginTerm('');
    setOriginSuggestions([]);
    setShowOriginSuggestions(false);
    setSelectedOrigin(null);
  };

  const handleDestClear = () => {
    setDestTerm('');
    setDestSuggestions([]);
    setShowDestSuggestions(false);
    setSelectedDest(null);
  };

  const handleRouteClick = () => {
    setIsRouteMode(!isRouteMode);
    // Clear single location search when switching to route mode
    if (!isRouteMode) {
      // Switching TO route mode
      // If there's a last selected location AND search term is not empty, use it as the origin
      if (lastSelectedLocation && searchTerm) {
        setOriginTerm(lastSelectedLocation.address);
        setSelectedOrigin(lastSelectedLocation);
      } else {
        // If search bar is empty, don't populate origin
        setOriginTerm('');
        setSelectedOrigin(null);
      }
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      // Clear route search when switching back to single location mode (cancel)
      setOriginTerm('');
      setDestTerm('');
      setOriginSuggestions([]);
      setDestSuggestions([]);
      setSelectedOrigin(null);
      setSelectedDest(null);
      // Clear the route info box
      if (onClearRoute) {
        onClearRoute();
      }
    }
  };

  const handleRouteSubmit = () => {
    if (selectedOrigin && selectedDest && onRouteSubmit) {
      onRouteSubmit(
        selectedOrigin.coords,
        selectedDest.coords,
        selectedOrigin.address,
        selectedDest.address
      );
    }
  };

  const handleSaveFavoriteRoute = () => {
    if (!currentRouteInfo || !onSaveFavoriteRoute) return;

    const name = window.prompt('Enter a name for this route:');
    if (name && name.trim()) {
      onSaveFavoriteRoute(
        name.trim(),
        currentRouteInfo.start,
        currentRouteInfo.end,
        currentRouteInfo.originAddress,
        currentRouteInfo.destinationAddress
      );
      alert('Route saved to favorites!');
    }
  };

  const handleSaveFavoriteLocation = () => {
    if (!searchedLocation || !onSaveFavoriteLocation) return;

    const name = window.prompt('Enter a name for this location:');
    if (name && name.trim()) {
      onSaveFavoriteLocation(
        name.trim(),
        searchedLocation,
        searchTerm
      );
      alert('Location saved to favorites!');
    }
  };

  return (
    <div className="absolute top-4 left-20 z-[1000]" ref={searchRef}>
      <div className="bg-white rounded-lg shadow-lg" style={{ width: '320px' }}>
        {!isRouteMode ? (
          // Single location search mode
          <div className="relative">
            <div className="flex items-center">
              <svg className="absolute left-3 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search location in California..."
                className="w-full pl-10 pr-32 py-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoComplete="off"
              />
              {searchTerm && searchedLocation && (
                <button
                  onClick={handleSaveFavoriteLocation}
                  className="absolute right-16 text-gray-400 hover:text-yellow-500 transition-colors"
                  title="Save to favorites"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={handleClear}
                  className="absolute right-10 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleRouteClick}
                className="absolute right-3 text-gray-400 hover:text-blue-600 transition-colors"
                title="Search for a route"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {suggestion.display_name}
                    </div>
                    {suggestion.address && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[suggestion.address.city, suggestion.address.state, suggestion.address.country]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showSuggestions && loadingSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                Loading suggestions...
              </div>
            )}
          </div>
        ) : (
          // Route search mode (origin + destination)
          <div className="space-y-2 p-2">
            {/* Origin search bar */}
            <div className="relative">
              <div className="flex items-center">
                <svg className="absolute left-3 w-4 h-4 text-green-500 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                <input
                  type="text"
                  value={originTerm}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  placeholder="Origin (California)..."
                  className="w-full pl-9 pr-16 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoComplete="off"
                />
                {originTerm && (
                  <button
                    onClick={handleOriginClear}
                    className="absolute right-3 text-gray-400 hover:text-gray-600"
                    title="Clear origin"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {originSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectOriginSuggestion(suggestion)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.display_name}
                      </div>
                      {suggestion.address && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[suggestion.address.city, suggestion.address.state, suggestion.address.country]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showOriginSuggestions && loadingOriginSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-gray-500">
                  Loading...
                </div>
              )}
            </div>

            {/* Destination search bar */}
            <div className="relative">
              <div className="flex items-center">
                <svg className="absolute left-3 w-4 h-4 text-red-500 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <input
                  type="text"
                  value={destTerm}
                  onChange={(e) => handleDestChange(e.target.value)}
                  placeholder="Destination (California)..."
                  className="w-full pl-9 pr-16 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoComplete="off"
                />
                {destTerm && (
                  <button
                    onClick={handleDestClear}
                    className="absolute right-3 text-gray-400 hover:text-gray-600"
                    title="Clear destination"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {destSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectDestSuggestion(suggestion)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.display_name}
                      </div>
                      {suggestion.address && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[suggestion.address.city, suggestion.address.state, suggestion.address.country]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showDestSuggestions && loadingDestSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-gray-500">
                  Loading...
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRouteClick}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRouteSubmit}
                disabled={!selectedOrigin || !selectedDest}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Search Route
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Route Info Box - displayed when route exists */}
      {route && (
        <div className="bg-white rounded-lg shadow-lg mt-2 p-3" style={{ width: '320px' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-gray-700">Route Info</h3>
            <button
              onClick={handleSaveFavoriteRoute}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
              title="Save to favorites"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Save
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Distance:</span> {(route.distance / 1609.34).toFixed(2)} miles
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Duration:</span> {Math.round(route.duration / 60)} minutes
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Cameras found:</span> {routeCameras?.length || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapSearch;
