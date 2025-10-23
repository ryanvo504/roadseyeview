# Road's Eye View - California Traffic Cameras

A full-stack web application for viewing live traffic camera feeds along your route throughout California.

## Features

- **Interactive Map**: View 3,266 California traffic cameras from 12 CalTrans districts on an OpenStreetMap-powered map
- **Route Planning**: Enter origin and destination to get driving directions
- **Single Location Search**: Search for and view cameras near any specific location
- **Camera Filtering**: Automatically find cameras along your planned route (within 1km buffer)
- **Live Video Streams**: Watch HLS video streams from traffic cameras
- **Camera Thumbnails**: Preview camera feeds with still images
- **Favorites**: Save frequently used routes and locations for quick access
- **Recents**: Automatic history of recently searched routes and locations
- **Smart Management**: Items saved to favorites are automatically removed from recents to avoid duplicates
- **Responsive UI**: Clean, modern interface built with Tailwind CSS and branded logo

## Technology Stack

### Frontend
- React.js
- Leaflet (OpenStreetMap)
- Tailwind CSS
- HLS.js (video streaming)
- Axios

### Backend
- Node.js
- Express
- CORS
- Axios

### APIs Used
- **ArcGIS FeatureServer**: CalTrans Highway CCTV camera data covering all 12 California districts
- **OSRM**: Free routing service (OpenStreetMap Routing Machine)
- **Nominatim**: Free geocoding service for address lookup (California-filtered)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <your-repo-url>
   cd oc-cams
   ```

2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

You'll need to run both the backend and frontend servers:

1. **Start the Backend Server**
   ```bash
   cd server
   npm run dev
   ```
   The server will start on `http://localhost:5001`

2. **Start the Frontend (in a new terminal)**
   ```bash
   cd client
   npm start
   ```
   The app will open in your browser at `http://localhost:3000`

## Usage Guide

### Viewing All Cameras
- When you first load the app, all active cameras throughout California are displayed on the map
- Click any camera marker to see basic info
- Click "View Camera" to open the full camera viewer with live stream

### Searching for a Location
1. Enter an address or location in the search bar
2. Select from the autocomplete suggestions
3. The map will center on that location
4. Only cameras near that location will be shown
5. Click the star icon to save the location to favorites

### Planning a Route
1. Click the route icon in the search bar
2. Enter your origin address in the "Origin" field
3. Enter your destination address in the "Destination" field
4. Click "Get Route"
5. The map will display your route in blue
6. Only cameras along your route (within 1km) will be shown
7. Click the star icon to save the route to favorites

### Using Favorites and Recents
- **Favorites**: Save routes or locations for quick access later
  - Click the star icon after searching a location or planning a route
  - Give it a name and it will be saved in the Favorites section
  - Click any favorite to quickly reload it
- **Recents**: Automatically tracks your recent searches (up to 10)
  - Every location or route search is automatically added
  - Click "Show" to expand and see your recent searches
  - Click any recent to reload it
  - Items saved to favorites are automatically removed from recents

### Viewing Camera Feeds
- Click any camera marker or camera in the list
- The camera viewer will open showing:
  - Live HLS video stream (if available)
  - Still image fallback (if video unavailable)
  - Camera details (location, coordinates, elevation)
- Use controls to play/pause, adjust volume, and go fullscreen

## Camera Data

The app uses CalTrans camera data covering all of California, which includes:
- 3,266 traffic cameras across 12 CalTrans districts (d1-d12)
- Statewide coverage of major highways and freeways
- Live HLS video streams (.m3u8 format) where available
- Still images updated periodically
- GPS coordinates and elevation data
- District coverage spans from San Diego (d11) to the Oregon border (d1)

## Project Structure

```
oc-cams/
├── client/                 # React frontend
│   ├── public/
│   │   └── logo.png       # Road's Eye View branding logo
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── CameraViewer.js    # Video player modal
│   │   │   ├── CameraList.js      # Camera list with thumbnails
│   │   │   ├── MapSearch.js       # Location & route search interface
│   │   │   ├── Favorites.js       # Saved routes & locations manager
│   │   │   └── Recents.js         # Recent searches tracker
│   │   ├── App.js         # Main application component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Tailwind CSS
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Express server & API endpoints
│   └── package.json
└── README.md
```

## API Endpoints

### `GET /api/cameras`
Returns all active traffic cameras with:
- Camera ID, name, location
- GPS coordinates
- Stream and image URLs
- Highway/route information

### `POST /api/route`
Request body:
```json
{
  "start": { "lat": 33.7175, "lng": -117.8311 },
  "end": { "lat": 33.6846, "lng": -117.8265 }
}
```
Returns route coordinates, distance, and duration

### `POST /api/cameras-along-route`
Request body:
```json
{
  "routeCoordinates": [[lng, lat], ...],
  "bufferDistance": 1000
}
```
Returns cameras within the specified buffer distance of the route

## Troubleshooting

### Video Stream Not Playing
- Some cameras only provide still images, not video streams
- Click "Show Still Image" to view the static camera feed
- Try opening the stream in a new tab for direct access

### Route Not Found
- Make sure addresses are specific and include city/state
- Try using landmarks or intersections instead of street addresses
- Ensure both origin and destination are in California

### Cameras Not Loading
- Check that the backend server is running on port 5001
- The camera data is cached for 5 minutes to reduce API calls
- Check browser console for any CORS or network errors

## Future Enhancements

Potential features to add:
- Real-time traffic overlays
- Camera search by highway/route
- Multi-stop route planning
- Mobile app version
- Weather integration
- Traffic incident alerts

## License

MIT

## Credits

- Camera data provided by CalTrans via ArcGIS
- Mapping by OpenStreetMap contributors
- Routing by OSRM Project
