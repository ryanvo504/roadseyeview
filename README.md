# Orange County Traffic Cameras Web App

A full-stack web application for viewing live traffic camera feeds along your route in Orange County, California.

## Features

- **Interactive Map**: View all 130+ Orange County traffic cameras on an OpenStreetMap-powered map
- **Route Planning**: Enter origin and destination to get driving directions
- **Camera Filtering**: Automatically find cameras along your planned route (within 1km buffer)
- **Live Video Streams**: Watch HLS video streams from traffic cameras
- **Camera Thumbnails**: Preview camera feeds with still images
- **Favorite Routes**: Save frequently used routes for quick access
- **Responsive UI**: Clean, modern interface built with Tailwind CSS

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
- **ArcGIS FeatureServer**: Orange County CalTrans Highway CCTV camera data
- **OSRM**: Free routing service (OpenStreetMap Routing Machine)
- **Nominatim**: Free geocoding service for address lookup

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
   The server will start on `http://localhost:5000`

2. **Start the Frontend (in a new terminal)**
   ```bash
   cd client
   npm start
   ```
   The app will open in your browser at `http://localhost:3000`

## Usage Guide

### Viewing All Cameras
- When you first load the app, all active cameras in Orange County are displayed on the map
- Click any camera marker to see basic info
- Click "View Camera" to open the full camera viewer with live stream

### Planning a Route
1. Enter your origin address in the "Origin" field
2. Enter your destination address in the "Destination" field
3. Click "Get Route"
4. The map will display your route in blue
5. Only cameras along your route (within 1km) will be shown

### Saving Favorite Routes
1. After planning a route, click "Save as Favorite"
2. Enter a name for your route (e.g., "Home to Work")
3. Click "Save"
4. Access saved routes from the "Favorite Routes" section

### Viewing Camera Feeds
- Click any camera marker or camera in the list
- The camera viewer will open showing:
  - Live HLS video stream (if available)
  - Still image fallback (if video unavailable)
  - Camera details (location, coordinates, elevation)
- Use controls to play/pause, adjust volume, and go fullscreen

## Camera Data

The app uses CalTrans camera data for Orange County (District 12), which includes:
- 130+ traffic cameras
- Coverage of major highways (I-5, SR-91, SR-55, SR-57, etc.)
- Live HLS video streams (.m3u8 format)
- Still images updated periodically
- GPS coordinates and elevation data

## Project Structure

```
oc-cams/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── CameraViewer.js    # Video player modal
│   │   │   ├── CameraList.js      # Camera list with thumbnails
│   │   │   ├── RouteForm.js       # Route input form
│   │   │   └── FavoriteRoutes.js  # Saved routes manager
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
- Ensure both origin and destination are in or near Orange County

### Cameras Not Loading
- Check that the backend server is running on port 5000
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
