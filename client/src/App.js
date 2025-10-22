import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import CameraViewer from './components/CameraViewer';
import RouteForm from './components/RouteForm';
import CameraList from './components/CameraList';
import FavoriteRoutes from './components/FavoriteRoutes';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Custom camera icon
const cameraIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNGI1NTYzIj48cGF0aCBkPSJNMTcgMTBjLTEuMSAwLTIgLjktMiAydjRjMCAxLjEuOSAyIDIgMmg2YzEuMSAwIDItLjkgMi0ydi00YzAtMS4xLS45LTItMi0yaC02em0wIDZ2LTRoNnY0aC02em0tMi0zYzAtMi43Ni0yLjI0LTUtNS01cy01IDIuMjQtNSA1IDIuMjQgNSA1IDUgNS0yLjI0IDUtNXptLTIgMGMwIDEuNjUtMS4zNSAzLTMgM3MtMy0xLjM1LTMtMyAxLjM1LTMgMy0zIDMgMS4zNSAzIDN6Ii8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const API_BASE_URL = 'http://localhost:5001/api';

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function App() {
  const [cameras, setCameras] = useState([]);
  const [routeCameras, setRouteCameras] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [mapCenter, setMapCenter] = useState([33.7175, -117.8311]); // Orange County center

  // Load favorite routes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteRoutes');
    if (saved) {
      setFavoriteRoutes(JSON.parse(saved));
    }
  }, []);

  // Fetch all cameras on mount
  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cameras`);
      setCameras(response.data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };

  const handleRouteSubmit = async (start, end) => {
    setLoading(true);
    try {
      // Get route
      const routeResponse = await axios.post(`${API_BASE_URL}/route`, { start, end });
      const routeData = routeResponse.data;

      // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
      const routeCoords = routeData.coordinates.map(coord => [coord[1], coord[0]]);
      setRoute({
        coordinates: routeCoords,
        distance: routeData.distance,
        duration: routeData.duration
      });

      // Get cameras along route
      const camerasResponse = await axios.post(`${API_BASE_URL}/cameras-along-route`, {
        routeCoordinates: routeData.coordinates,
        bufferDistance: 1000 // 1km buffer
      });
      setRouteCameras(camerasResponse.data);

      // Center map on route
      if (routeCoords.length > 0) {
        const midPoint = routeCoords[Math.floor(routeCoords.length / 2)];
        setMapCenter(midPoint);
      }
    } catch (error) {
      console.error('Error getting route:', error);
      alert('Failed to get route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveFavoriteRoute = (name, start, end) => {
    const newFavorite = {
      id: Date.now(),
      name,
      start,
      end
    };
    const updated = [...favoriteRoutes, newFavorite];
    setFavoriteRoutes(updated);
    localStorage.setItem('favoriteRoutes', JSON.stringify(updated));
  };

  const deleteFavoriteRoute = (id) => {
    const updated = favoriteRoutes.filter(fav => fav.id !== id);
    setFavoriteRoutes(updated);
    localStorage.setItem('favoriteRoutes', JSON.stringify(updated));
  };

  const loadFavoriteRoute = (favorite) => {
    handleRouteSubmit(favorite.start, favorite.end);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-lg overflow-y-auto">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">OC Traffic Cams</h1>

          <RouteForm
            onSubmit={handleRouteSubmit}
            loading={loading}
            onSaveFavorite={saveFavoriteRoute}
          />

          {route && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-700">Route Info</h3>
              <p className="text-sm text-gray-600">
                Distance: {(route.distance / 1609.34).toFixed(2)} miles
              </p>
              <p className="text-sm text-gray-600">
                Duration: {Math.round(route.duration / 60)} minutes
              </p>
              <p className="text-sm text-gray-600">
                Cameras found: {routeCameras.length}
              </p>
            </div>
          )}

          <FavoriteRoutes
            favorites={favoriteRoutes}
            onLoad={loadFavoriteRoute}
            onDelete={deleteFavoriteRoute}
          />

          <CameraList
            cameras={route ? routeCameras : cameras}
            onCameraSelect={setSelectedCamera}
            selectedCamera={selectedCamera}
            showAll={!route}
          />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={11}
          className="h-full w-full"
        >
          <MapController center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          {route && (
            <Polyline
              positions={route.coordinates}
              color="blue"
              weight={4}
              opacity={0.7}
            />
          )}

          {/* Camera markers */}
          {(route ? routeCameras : cameras).map(camera => (
            <Marker
              key={camera.id}
              position={[camera.latitude, camera.longitude]}
              icon={cameraIcon}
              eventHandlers={{
                click: () => setSelectedCamera(camera)
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{camera.name}</p>
                  <p className="text-gray-600">{camera.route} - {camera.direction}</p>
                  <button
                    onClick={() => setSelectedCamera(camera)}
                    className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    View Camera
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Camera Viewer Modal */}
        {selectedCamera && (
          <CameraViewer
            camera={{
              ...selectedCamera,
              streamUrl: selectedCamera.streamUrl
                ? `${API_BASE_URL}/stream-proxy?url=${encodeURIComponent(selectedCamera.streamUrl)}`
                : null
            }}
            onClose={() => setSelectedCamera(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
