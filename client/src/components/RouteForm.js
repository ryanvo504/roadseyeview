import React, { useState } from 'react';

function RouteForm({ onSubmit, loading, onSaveFavorite }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [lastRoute, setLastRoute] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      alert('Please enter both origin and destination');
      return;
    }

    try {
      // Geocode addresses using Nominatim (free OpenStreetMap geocoder)
      const originCoords = await geocodeAddress(origin);
      const destCoords = await geocodeAddress(destination);

      if (!originCoords || !destCoords) {
        alert('Could not find one or more addresses. Please try again.');
        return;
      }

      setLastRoute({ start: originCoords, end: destCoords });
      onSubmit(originCoords, destCoords);
    } catch (error) {
      console.error('Error geocoding addresses:', error);
      alert('Failed to geocode addresses. Please try again.');
    }
  };

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

    onSaveFavorite(favoriteName, lastRoute.start, lastRoute.end);
    setShowSaveDialog(false);
    setFavoriteName('');
    alert('Route saved to favorites!');
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Plan Route</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origin
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter starting address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
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
