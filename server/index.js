const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy (required for Render to get correct protocol)
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
  'https://oc-cams.vercel.app',
  'http://localhost:3000',
  'http://localhost:5001'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// CalTrans Camera Data URLs (Districts 1-12)
const CALTRANS_BASE_URL = 'https://cwwp2.dot.ca.gov/data';
const DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Cache for camera data (loaded once at startup)
let cameraCache = [];
let cacheLoadedAt = null;

// Fetch all camera data from CalTrans districts
async function fetchAllCameras() {
  console.log('Fetching camera data from CalTrans...');
  const startTime = Date.now();

  try {
    // Fetch all district JSONs in parallel
    const districtPromises = DISTRICTS.map(async (districtNum) => {
      const url = `${CALTRANS_BASE_URL}/d${districtNum}/cctv/cctvStatusD${String(districtNum).padStart(2, '0')}.json`;
      try {
        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data.data || response.data || [];
        console.log(`✓ District ${districtNum}: ${data.length} cameras`);
        return data;
      } catch (error) {
        console.error(`✗ District ${districtNum} failed:`, error.message);
        return [];
      }
    });

    const districtResults = await Promise.all(districtPromises);

    // Flatten and transform camera data
    const allCameras = districtResults.flat();

    const transformedCameras = allCameras
      .map((item, index) => {
        const camera = item.cctv;

        // Skip cameras without location data
        if (!camera || !camera.location || !camera.location.latitude || !camera.location.longitude) {
          return null;
        }

        return {
          id: `d${camera.location.district}-${camera.index || index}`,
          name: camera.location.locationName || 'Unknown Location',
          nearbyPlace: camera.location.nearbyPlace || '',
          route: camera.location.route || '',
          direction: camera.location.direction || '',
          latitude: parseFloat(camera.location.latitude),
          longitude: parseFloat(camera.location.longitude),
          elevation: parseFloat(camera.location.elevation) || 0,
          streamUrl: camera.imageData?.streamingVideoURL || null,
          imageUrl: camera.imageData?.static?.currentImageURL || null,
          inService: camera.inService === 'true' || camera.inService === true,
          county: camera.location.county || '',
          district: camera.location.district || '',
          postmile: camera.location.postmile || '',
          milepost: camera.location.milepost || ''
        };
      })
      .filter(camera => camera !== null); // Remove invalid entries

    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Camera data loaded successfully: ${transformedCameras.length} cameras in ${loadTime}s`);

    return transformedCameras;
  } catch (error) {
    console.error('Error fetching camera data:', error.message);
    return [];
  }
}

// Load cameras on startup
async function initializeCameraCache() {
  cameraCache = await fetchAllCameras();
  cacheLoadedAt = new Date();

  if (cameraCache.length === 0) {
    console.warn('⚠ Warning: No camera data loaded. Server will still start but cameras may not be available.');
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: "Road's Eye View API",
    version: '1.0.0',
    endpoints: {
      health: '/health',
      cameras: '/api/cameras',
      route: 'POST /api/route',
      camerasAlongRoute: 'POST /api/cameras-along-route',
      streamProxy: '/api/stream-proxy?url=',
      refreshCameras: 'POST /api/refresh-cameras'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    cameras: cameraCache.length,
    cacheLoadedAt: cacheLoadedAt
  });
});

// Endpoint to get all cameras
app.get('/api/cameras', async (req, res) => {
  try {
    res.json(cameraCache);
  } catch (error) {
    console.error('Error fetching cameras:', error.message);
    res.status(500).json({ error: 'Failed to fetch camera data' });
  }
});

// Manual refresh endpoint
app.post('/api/refresh-cameras', async (req, res) => {
  try {
    console.log('Manual camera refresh requested...');
    cameraCache = await fetchAllCameras();
    cacheLoadedAt = new Date();

    res.json({
      success: true,
      camerasLoaded: cameraCache.length,
      loadedAt: cacheLoadedAt
    });
  } catch (error) {
    console.error('Error refreshing cameras:', error.message);
    res.status(500).json({ error: 'Failed to refresh camera data' });
  }
});

// Endpoint to get route using OpenRouteService
app.post('/api/route', async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      console.error('Invalid coordinates:', { start, end });
      return res.status(400).json({ error: 'Invalid start or end coordinates' });
    }

    // Using OpenRouteService (free, no API key required for basic usage)
    // Alternative: can also use OSRM (osrm-project.org) which is fully free
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    console.log('Requesting route:', osrmUrl);

    const response = await axios.get(osrmUrl, {
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Don't throw on 4xx errors
      }
    });

    if (response.status >= 400) {
      console.error('OSRM returned error:', response.status, response.data);
      return res.status(400).json({
        error: 'Could not find route',
        details: response.data?.message || 'Routing service error'
      });
    }

    if (response.data.code !== 'Ok') {
      console.error('OSRM response code:', response.data.code, response.data);
      return res.status(400).json({
        error: 'Could not find route',
        details: response.data?.message || 'No route found'
      });
    }

    const route = response.data.routes[0];

    res.json({
      coordinates: route.geometry.coordinates,
      distance: route.distance, // in meters
      duration: route.duration // in seconds
    });
  } catch (error) {
    console.error('Error fetching route:', error.message, error.response?.data);
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

    // Find cameras near the route
    const camerasNearRoute = cameraCache.filter(camera => {
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

      // Get the server URL dynamically (will work for both local and deployed)
      // Trust proxy headers for correct protocol detection (Render uses reverse proxy)
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const serverUrl = `${protocol}://${host}`;

      // Replace relative URLs with proxied URLs
      playlist = playlist.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          const segmentUrl = baseUrl + line;
          return `${serverUrl}/api/stream-proxy?url=${encodeURIComponent(segmentUrl)}`;
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

// Initialize camera cache and start server
async function startServer() {
  await initializeCameraCache();

  app.listen(PORT, () => {
    console.log(`\n✓ Server running on port ${PORT}`);
    console.log(`✓ Camera cache loaded: ${cameraCache.length} cameras`);
    console.log(`✓ Last updated: ${cacheLoadedAt}\n`);
  });
}

startServer();
