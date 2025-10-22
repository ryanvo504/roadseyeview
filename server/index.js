const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// ArcGIS Camera Data URL
const CAMERA_API_URL = 'https://services.arcgis.com/UXmFoWC7yDHcDN5Q/arcgis/rest/services/OC_CalTrans_Highway_CCTV/FeatureServer/1/query?where=1%3D1&outFields=*&returnGeometry=true&f=json';

// Cache for camera data
let cameraCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Endpoint to get all cameras
app.get('/api/cameras', async (req, res) => {
  try {
    // Check if cache is valid
    if (cameraCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return res.json(cameraCache);
    }

    // Fetch fresh data
    const response = await axios.get(CAMERA_API_URL);
    const cameras = response.data.features.map(feature => ({
      id: feature.attributes.OBJECTID,
      name: feature.attributes.locationName,
      nearbyPlace: feature.attributes.nearbyPlace,
      route: feature.attributes.route,
      direction: feature.attributes.direction,
      latitude: feature.attributes.latitude,
      longitude: feature.attributes.longitude,
      elevation: feature.attributes.elevation,
      streamUrl: feature.attributes.streamingVideoURL,
      imageUrl: feature.attributes.currentImageURL,
      inService: feature.attributes.inService,
      county: feature.attributes.county
    }));

    // Filter only cameras that are in service
    const activeCameras = cameras.filter(cam => cam.inService);

    // Update cache
    cameraCache = activeCameras;
    cacheTimestamp = Date.now();

    res.json(activeCameras);
  } catch (error) {
    console.error('Error fetching cameras:', error.message);
    res.status(500).json({ error: 'Failed to fetch camera data' });
  }
});

// Endpoint to get route using OpenRouteService
app.post('/api/route', async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      return res.status(400).json({ error: 'Invalid start or end coordinates' });
    }

    // Using OpenRouteService (free, no API key required for basic usage)
    // Alternative: can also use OSRM (osrm-project.org) which is fully free
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const response = await axios.get(osrmUrl);

    if (response.data.code !== 'Ok') {
      return res.status(400).json({ error: 'Could not find route' });
    }

    const route = response.data.routes[0];

    res.json({
      coordinates: route.geometry.coordinates,
      distance: route.distance, // in meters
      duration: route.duration // in seconds
    });
  } catch (error) {
    console.error('Error fetching route:', error.message);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Endpoint to find cameras along a route
app.post('/api/cameras-along-route', async (req, res) => {
  try {
    const { routeCoordinates, bufferDistance = 1000 } = req.body; // buffer in meters

    if (!routeCoordinates || !Array.isArray(routeCoordinates)) {
      return res.status(400).json({ error: 'Invalid route coordinates' });
    }

    // Get all cameras
    let cameras;
    if (cameraCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      cameras = cameraCache;
    } else {
      const response = await axios.get(CAMERA_API_URL);
      cameras = response.data.features
        .filter(f => f.attributes.inService)
        .map(feature => ({
          id: feature.attributes.OBJECTID,
          name: feature.attributes.locationName,
          nearbyPlace: feature.attributes.nearbyPlace,
          route: feature.attributes.route,
          direction: feature.attributes.direction,
          latitude: feature.attributes.latitude,
          longitude: feature.attributes.longitude,
          elevation: feature.attributes.elevation,
          streamUrl: feature.attributes.streamingVideoURL,
          imageUrl: feature.attributes.currentImageURL,
          inService: feature.attributes.inService,
          county: feature.attributes.county
        }));
      cameraCache = cameras;
      cacheTimestamp = Date.now();
    }

    // Find cameras near the route
    const camerasNearRoute = cameras.filter(camera => {
      return routeCoordinates.some(coord => {
        const distance = getDistanceFromLatLonInMeters(
          camera.latitude,
          camera.longitude,
          coord[1], // coordinates are [lng, lat]
          coord[0]
        );
        return distance <= bufferDistance;
      });
    });

    res.json(camerasNearRoute);
  } catch (error) {
    console.error('Error finding cameras along route:', error.message);
    res.status(500).json({ error: 'Failed to find cameras along route' });
  }
});

// Helper function to calculate distance between two coordinates
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in meters
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Proxy endpoint for HLS streams to bypass CORS
app.get('/api/stream-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Proxying stream:', url);

    // Fetch the stream content with no caching
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      timeout: 10000, // 10 second timeout
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Don't throw on 404
      }
    });

    // Handle 404 and other errors
    if (response.status === 404) {
      console.error('Stream not found (404):', url);
      return res.status(404).json({
        error: 'Stream not available',
        message: 'This camera stream is currently offline or the URL has changed'
      });
    }

    if (response.status >= 400) {
      console.error('Stream error', response.status, url);
      return res.status(response.status).json({
        error: 'Stream error',
        status: response.status
      });
    }

    // Determine content type
    const contentType = response.headers['content-type'] ||
                       (url.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' :
                        url.endsWith('.ts') ? 'video/MP2T' :
                        'application/octet-stream');

    // Set CORS and anti-caching headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // If it's a playlist, modify URLs to go through our proxy
    if (url.endsWith('.m3u8')) {
      let playlist = response.data.toString();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      // Replace relative URLs with proxied URLs
      playlist = playlist.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          const segmentUrl = baseUrl + line;
          return `http://localhost:${PORT}/api/stream-proxy?url=${encodeURIComponent(segmentUrl)}`;
        }
        return line;
      }).join('\n');

      res.send(playlist);
    } else {
      // Send binary data for video segments
      res.send(Buffer.from(response.data));
    }
  } catch (error) {
    console.error('Stream proxy error:', error.message);
    res.status(500).json({ error: 'Failed to proxy stream' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
