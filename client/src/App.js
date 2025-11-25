import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import CameraViewer from './components/CameraViewer';
import CameraList from './components/CameraList';
import Favorites from './components/Favorites';
import Recents from './components/Recents';
import MapSearch from './components/MapSearch';
import LoadingScreen from './components/LoadingScreen';
import { Analytics } from "@vercel/analytics/react"

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Custom camera icon
const cameraIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="#1e40af" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3" fill="white"/></svg>`),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function MapController({ route, sidebarCollapsed, searchedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.coordinates && route.coordinates.length > 0) {
      // Fit map to show entire route with padding
      const bounds = route.coordinates.map(coord => [coord[0], coord[1]]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (searchedLocation) {
      // Center on searched location with closer zoom
      map.setView([searchedLocation.lat, searchedLocation.lng], 13);
    }
    // Don't recenter to default position when route is cleared - let map stay where it is
  }, [route, map, searchedLocation]);

  // Invalidate map size when sidebar is collapsed/expanded
  useEffect(() => {
    // Small delay to allow CSS transition to complete
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300); // Match the transition duration

    return () => clearTimeout(timer);
  }, [sidebarCollapsed, map]);

  return null;
}

function App() {
  const [cameras, setCameras] = useState([]);
  const [routeCameras, setRouteCameras] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [recents, setRecents] = useState([]);
  const mapCenter = [36.7783, -119.4179]; // California center
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [currentRouteInfo, setCurrentRouteInfo] = useState(null); // Store current route origin/destination
  const [loadedRouteAddresses, setLoadedRouteAddresses] = useState(null); // Store addresses when loading from favorites/recents
  const [loadedLocation, setLoadedLocation] = useState(null); // Store location when loading from favorites/recents
  const [showStreamsOnly, setShowStreamsOnly] = useState(true); // Filter to show only cameras with video streams
  const favoritesRef = useRef(null);
  const recentsRef = useRef(null);
  const camerasRef = useRef(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Load recents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recents');
    if (saved) {
      setRecents(JSON.parse(saved));
    }
  }, []);

  // Fetch cameras function
  const fetchCameras = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cameras`);
      setCameras(response.data);
      // Only hide loading screen if we got cameras
      if (response.data && response.data.length > 0) {
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      // Retry after 3 seconds if fetch fails (handles cold start)
      setTimeout(fetchCameras, 3000);
    }
  };

  // Fetch all cameras on mount
  useEffect(() => {
    fetchCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter cameras based on showStreamsOnly
  const filteredCameras = useMemo(() => {
    if (!showStreamsOnly) return cameras;
    return cameras.filter(camera => camera.streamUrl !== null);
  }, [cameras, showStreamsOnly]);

  const filteredRouteCameras = useMemo(() => {
    if (!showStreamsOnly) return routeCameras;
    return routeCameras.filter(camera => camera.streamUrl !== null);
  }, [routeCameras, showStreamsOnly]);

  const handleRouteSubmit = async (start, end, originAddress = null, destinationAddress = null) => {
    setLoading(true);
    // Clear searched location when submitting a route
    setSearchedLocation(null);
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

      // Store current route info for saving to favorites
      setCurrentRouteInfo({
        start,
        end,
        originAddress,
        destinationAddress
      });

      // Get cameras along route
      const camerasResponse = await axios.post(`${API_BASE_URL}/cameras-along-route`, {
        routeCoordinates: routeData.coordinates,
        bufferDistance: 1000 // 1km buffer
      });
      setRouteCameras(camerasResponse.data);

      // Add to recent routes (limit to 10 most recent)
      const originAddr = originAddress || `${start.lat.toFixed(4)}, ${start.lng.toFixed(4)}`;
      const destAddr = destinationAddress || `${end.lat.toFixed(4)}, ${end.lng.toFixed(4)}`;

      // Check if this route exists in favorites
      const isInFavorites = favorites.some(fav =>
        fav.type === 'route' &&
        fav.originAddress === originAddr &&
        fav.destinationAddress === destAddr
      );

      // Check if this route already exists in recents
      const isDuplicate = recents.some(recent =>
        recent.type === 'route' &&
        recent.originAddress === originAddr &&
        recent.destinationAddress === destAddr
      );

      // Only add if it's not a duplicate and not in favorites
      if (!isDuplicate && !isInFavorites) {
        const newRecent = {
          id: Date.now(),
          type: 'route',
          start,
          end,
          originAddress: originAddr,
          destinationAddress: destAddr,
          searchedAt: new Date().toISOString()
        };

        const updatedRecents = [newRecent, ...recents].slice(0, 10);
        setRecents(updatedRecents);
        localStorage.setItem('recents', JSON.stringify(updatedRecents));
      }
    } catch (error) {
      console.error('Error getting route:', error);
      alert('Failed to get route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveFavorite = (name, data) => {
    const newFavorite = {
      id: Date.now(),
      name,
      ...data,
      savedAt: new Date().toISOString()
    };
    const updated = [...favorites, newFavorite];
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));

    // Remove from recents if it exists there
    let updatedRecents = recents;
    if (data.type === 'route') {
      updatedRecents = recents.filter(recent =>
        !(recent.type === 'route' &&
          recent.originAddress === data.originAddress &&
          recent.destinationAddress === data.destinationAddress)
      );
    } else if (data.type === 'location') {
      updatedRecents = recents.filter(recent =>
        !(recent.type === 'location' &&
          recent.coords.lat === data.coords.lat &&
          recent.coords.lng === data.coords.lng)
      );
    }

    if (updatedRecents.length !== recents.length) {
      setRecents(updatedRecents);
      localStorage.setItem('recents', JSON.stringify(updatedRecents));
    }
  };

  const saveFavoriteRoute = (name, start, end, originAddress, destinationAddress) => {
    saveFavorite(name, {
      type: 'route',
      start,
      end,
      originAddress,
      destinationAddress
    });
  };

  const saveFavoriteLocation = (name, coords, address) => {
    saveFavorite(name, {
      type: 'location',
      coords,
      address
    });
  };

  const deleteFavorite = (id) => {
    const updated = favorites.filter(fav => fav.id !== id);
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  const loadFavorite = (favorite) => {
    if (favorite.type === 'location') {
      // Load single location
      setSearchedLocation(favorite.coords);
      setRoute(null);
      setRouteCameras([]);
      setLoadedRouteAddresses(null);
      setLoadedLocation({
        coords: favorite.coords,
        address: favorite.address
      });
    } else {
      // Load route
      setLoadedLocation(null);
      setLoadedRouteAddresses({
        origin: {
          coords: favorite.start,
          address: favorite.originAddress
        },
        destination: {
          coords: favorite.end,
          address: favorite.destinationAddress
        }
      });
      handleRouteSubmit(favorite.start, favorite.end, favorite.originAddress, favorite.destinationAddress);
    }
  };

  const clearRecents = () => {
    setRecents([]);
    localStorage.setItem('recents', JSON.stringify([]));
  };

  const deleteRecent = (id) => {
    const updated = recents.filter(recent => recent.id !== id);
    setRecents(updated);
    localStorage.setItem('recents', JSON.stringify(updated));
  };

  const loadRecent = (recent) => {
    if (recent.type === 'location') {
      // Load single location
      setSearchedLocation(recent.coords);
      setRoute(null);
      setRouteCameras([]);
      setLoadedRouteAddresses(null);
      setLoadedLocation({
        coords: recent.coords,
        address: recent.address
      });
    } else {
      // Load route
      setLoadedLocation(null);
      setLoadedRouteAddresses({
        origin: {
          coords: recent.start,
          address: recent.originAddress
        },
        destination: {
          coords: recent.end,
          address: recent.destinationAddress
        }
      });
      handleRouteSubmit(recent.start, recent.end, recent.originAddress, recent.destinationAddress);
    }
  };

  const expandAndScrollTo = (ref, shouldExpand = false) => {
    setSidebarCollapsed(false);
    setTimeout(() => {
      // Collapse all sections first
      if (recentsRef.current?.collapse) {
        recentsRef.current.collapse();
      }
      if (favoritesRef.current?.collapse) {
        favoritesRef.current.collapse();
      }
      if (camerasRef.current?.collapse) {
        camerasRef.current.collapse();
      }

      // Then expand only the target section if requested
      if (shouldExpand && ref.current?.expand) {
        ref.current.expand();
      }

      // Scroll to the target section
      if (ref.current?.scrollIntoView) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300); // Wait for sidebar expand animation
  };

  const handleLocationSearch = (coords, address) => {
    setSearchedLocation(coords);
    // Clear route when searching for a single location
    setRoute(null);
    setRouteCameras([]);

    // Check if location exists in favorites
    const isInFavorites = favorites.some(fav =>
      fav.type === 'location' &&
      fav.coords.lat === coords.lat &&
      fav.coords.lng === coords.lng
    );

    // Add to recents if not duplicate and not in favorites
    const isDuplicate = recents.some(recent =>
      recent.type === 'location' &&
      recent.coords.lat === coords.lat &&
      recent.coords.lng === coords.lng
    );

    if (!isDuplicate && !isInFavorites) {
      const newRecent = {
        id: Date.now(),
        type: 'location',
        coords,
        address,
        searchedAt: new Date().toISOString()
      };

      const updatedRecents = [newRecent, ...recents].slice(0, 10);
      setRecents(updatedRecents);
      localStorage.setItem('recents', JSON.stringify(updatedRecents));
    }
  };

  const handleClearRoute = () => {
    setRoute(null);
    setRouteCameras([]);
    setCurrentRouteInfo(null);
  };

  // Show loading screen while cameras are loading (handles Render cold start)
  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`bg-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-96'}`}>
        {sidebarCollapsed ? (
          /* Collapsed - Icon View */
          <div className="flex flex-col items-center py-4 gap-4">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-3 hover:bg-white/10 rounded-lg transition-colors group"
              title="Expand sidebar"
            >
              <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="w-full border-t border-white/10"></div>

            {recents.length > 0 && (
              <button
                onClick={() => expandAndScrollTo(recentsRef, true)}
                className="p-3 hover:bg-white/10 rounded-lg transition-colors group relative"
                title={`${recents.length} Recents`}
              >
                <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {recents.length}
                </span>
              </button>
            )}

            {favorites.length > 0 && (
              <button
                onClick={() => expandAndScrollTo(favoritesRef, true)}
                className="p-3 hover:bg-white/10 rounded-lg transition-colors group relative"
                title={`${favorites.length} Favorites`}
              >
                <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {favorites.length}
                </span>
              </button>
            )}

            <button
              onClick={() => expandAndScrollTo(camerasRef, true)}
              className="p-3 hover:bg-white/10 rounded-lg transition-colors group relative"
              title={`${(route ? filteredRouteCameras : filteredCameras).length} Cameras`}
            >
              <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {(route ? filteredRouteCameras : filteredCameras).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-slate-600 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-semibold">
                  {(route ? filteredRouteCameras : filteredCameras).length}
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Expanded - Full View */
          <div className="p-4">
            <div className="flex items-center justify-between">
              <img src="/logo.png" alt="Roads Eye View" className="h-32 object-fill brightness-0 invert" />
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Collapse sidebar"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <Recents
              ref={recentsRef}
              recents={recents}
              onLoad={loadRecent}
              onDelete={deleteRecent}
              onClearAll={clearRecents}
            />

            <Favorites
              ref={favoritesRef}
              favorites={favorites}
              onLoad={loadFavorite}
              onDelete={deleteFavorite}
            />

            <CameraList
              ref={camerasRef}
              cameras={route ? filteredRouteCameras : filteredCameras}
              onCameraSelect={setSelectedCamera}
              selectedCamera={selectedCamera}
              showAll={!route}
              showStreamsOnly={showStreamsOnly}
              onShowStreamsOnlyChange={setShowStreamsOnly}
            />
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          className="h-full w-full"
        >
          <MapController route={route} sidebarCollapsed={sidebarCollapsed} searchedLocation={searchedLocation} />
          <MapSearch
            onLocationSelect={handleLocationSearch}
            onRouteSubmit={handleRouteSubmit}
            onClearRoute={handleClearRoute}
            onSaveFavoriteRoute={saveFavoriteRoute}
            onSaveFavoriteLocation={saveFavoriteLocation}
            route={route}
            routeCameras={routeCameras}
            currentRouteInfo={currentRouteInfo}
            loadedRouteAddresses={loadedRouteAddresses}
            loadedLocation={loadedLocation}
            searchedLocation={searchedLocation}
          />
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={`https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`}
          />

          {/* Route polyline */}
          {route && (
            <>
              <Polyline
                positions={route.coordinates}
                color="#3b82f6"
                weight={5}
                opacity={0.9}
              />

              {/* Origin marker (green dot) */}
              {route.coordinates.length > 0 && (
                <Marker
                  position={route.coordinates[0]}
                  icon={L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12]
                  })}
                >
                  <Popup>Origin</Popup>
                </Marker>
              )}

              {/* Destination marker (red pin) */}
              {route.coordinates.length > 1 && (
                <Marker
                  position={route.coordinates[route.coordinates.length - 1]}
                  icon={L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZWYzNDQzIj48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNSA1LjEzIDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ny0zLjEzLTctNy03em0wIDkuNWMtMS4zOCAwLTIuNS0xLjEyLTIuNS0yLjVzMS4xMi0yLjUgMi41LTIuNSAyLjUgMS4xMiAyLjUgMi41LTEuMTIgMi41LTIuNSAyLjV6Ii8+PC9zdmc+',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                  })}
                >
                  <Popup>Destination</Popup>
                </Marker>
              )}
            </>
          )}

          {/* Searched location marker */}
          {searchedLocation && (
            <Marker
              position={[searchedLocation.lat, searchedLocation.lng]}
              icon={L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZWYzNDQzIj48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNSA1LjEzIDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ny0zLjEzLTctNy03em0wIDkuNWMtMS4zOCAwLTIuNS0xLjEyLTIuNS0yLjVzMS4xMi0yLjUgMi41LTIuNSAyLjUgMS4xMiAyLjUgMi41LTEuMTIgMi41LTIuNSAyLjV6Ii8+PC9zdmc+',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
              })}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Searched Location</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Camera markers */}
          {(route ? filteredRouteCameras : filteredCameras).map(camera => (
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

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
