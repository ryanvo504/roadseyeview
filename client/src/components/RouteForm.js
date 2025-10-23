import React, { useState, useEffect, useRef } from 'react';

function RouteForm({ onSubmit, loading, onSaveFavorite }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [lastRoute, setLastRoute] = useState(null);

  // Autocomplete states
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Store coordinates from selected autocomplete suggestions
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const originRef = useRef(null);
  const destinationRef = useRef(null);
  const debounceTimeout = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      alert('Please enter both origin and destination');
      return;
    }

    try {
      // Use stored coordinates from autocomplete if available, otherwise geocode
      let finalOriginCoords = originCoords;
      let finalDestCoords = destinationCoords;

      // Only geocode if we don't have coordinates from autocomplete selection
      if (!finalOriginCoords) {
        finalOriginCoords = await geocodeAddress(origin);
      }

      if (!finalDestCoords) {
        finalDestCoords = await geocodeAddress(destination);
      }

      if (!finalOriginCoords || !finalDestCoords) {
        alert('Could not find one or more addresses. Please try again.');
        return;
      }

      setLastRoute({
        start: finalOriginCoords,
        end: finalDestCoords,
        originAddress: origin,
        destinationAddress: destination
      });
      onSubmit(finalOriginCoords, finalDestCoords, origin, destination);
    } catch (error) {
      console.error('Error geocoding addresses:', error);
      alert('Failed to geocode addresses. Please try again.');
    }
  };

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

  // Debounced handler for origin input
  const handleOriginChange = (value) => {
    setOrigin(value);
    setOriginCoords(null); // Clear stored coordinates when user types
    setOriginSuggestions([]); // Clear old suggestions immediately
    setShowOriginSuggestions(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Don't show suggestions if input is too short
    if (!value || value.length < 3) {
      setShowOriginSuggestions(false);
      return;
    }

    debounceTimeout.current = setTimeout(async () => {
      const suggestions = await fetchSuggestions(value);
      setOriginSuggestions(suggestions);
    }, 300);
  };

  // Debounced handler for destination input
  const handleDestinationChange = (value) => {
    setDestination(value);
    setDestinationCoords(null); // Clear stored coordinates when user types
    setDestinationSuggestions([]); // Clear old suggestions immediately
    setShowDestinationSuggestions(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Don't show suggestions if input is too short
    if (!value || value.length < 3) {
      setShowDestinationSuggestions(false);
      return;
    }

    debounceTimeout.current = setTimeout(async () => {
      const suggestions = await fetchSuggestions(value);
      setDestinationSuggestions(suggestions);
    }, 300);
  };

  // Select a suggestion for origin
  const selectOriginSuggestion = (suggestion) => {
    setOrigin(suggestion.display_name);
    // Store coordinates directly from the suggestion
    setOriginCoords({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
  };

  // Select a suggestion for destination
  const selectDestinationSuggestion = (suggestion) => {
    setDestination(suggestion.display_name);
    // Store coordinates directly from the suggestion
    setDestinationCoords({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
    setShowDestinationSuggestions(false);
    setDestinationSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originRef.current && !originRef.current.contains(event.target)) {
        setShowOriginSuggestions(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target)) {
        setShowDestinationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleSaveFavorite = () => {
    if (!favoriteName) {
      alert('Please enter a name for this route');
      return;
    }
    if (!lastRoute) {
      alert('Please submit a route first');
      return;
    }

    console.log('lastRoute data:', lastRoute);
    console.log('Addresses being saved:', {
      origin: lastRoute.originAddress,
      destination: lastRoute.destinationAddress
    });

    onSaveFavorite(
      favoriteName,
      lastRoute.start,
      lastRoute.end,
      lastRoute.originAddress,
      lastRoute.destinationAddress
    );
    setShowSaveDialog(false);
    setFavoriteName('');
    alert('Route saved to favorites!');
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Plan Route</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div ref={originRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origin
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => handleOriginChange(e.target.value)}
            placeholder="Enter starting address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            autoComplete="off"
          />
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
          {showOriginSuggestions && loadingSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
              Loading suggestions...
            </div>
          )}
        </div>

        <div ref={destinationRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="Enter destination address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            autoComplete="off"
          />
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {destinationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectDestinationSuggestion(suggestion)}
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
          {showDestinationSuggestions && loadingSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
              Loading suggestions...
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Finding Route...' : 'Get Route'}
        </button>
      </form>

      {lastRoute && !showSaveDialog && (
        <button
          onClick={() => setShowSaveDialog(true)}
          className="w-full mt-2 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors text-sm"
        >
          Save as Favorite
        </button>
      )}

      {showSaveDialog && (
        <div className="mt-3 p-3 bg-white border border-gray-300 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Route Name
          </label>
          <input
            type="text"
            value={favoriteName}
            onChange={(e) => setFavoriteName(e.target.value)}
            placeholder="e.g., Home to Work"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveFavorite}
              className="flex-1 bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 text-sm"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setFavoriteName('');
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteForm;
