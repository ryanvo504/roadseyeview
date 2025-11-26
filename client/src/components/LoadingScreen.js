import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  const mountRef = useRef(null);
  const [isThreeLoaded, setIsThreeLoaded] = useState(false);
  const [, setLoadingText] = useState("Initializing Hologram...");

  // 1. Load Three.js
  useEffect(() => {
    if (window.THREE) {
      setIsThreeLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setIsThreeLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 2. Scene Setup
  useEffect(() => {
    if (!isThreeLoaded || !mountRef.current) return;

    setLoadingText("Calibrating Grid...");
    const THREE = window.THREE;
    const currentMount = mountRef.current; // Capture ref value for cleanup

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 220; // Camera distance

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Main Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // --- 1. THE GLOBE (Particles) ---
    const createParticleGlobe = (imageUrl) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;

      img.onload = () => {
        setLoadingText("System Online");
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const vertices = [];
        const radius = 100;
        
        // Denser step for "solid" look (step 2 is dense, step 4 is loose)
        const step = 2; 

        for (let y = 0; y < canvas.height; y += step) {
          for (let x = 0; x < canvas.width; x += step) {
            const i = (y * canvas.width + x) * 4;
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

            // Only render land (bright pixels)
            if (brightness > 60) {
              const phi = (1 - y / canvas.height) * Math.PI;
              const theta = (x / canvas.width) * 2 * Math.PI;

              const vx = radius * Math.sin(phi) * Math.cos(theta);
              const vy = radius * Math.cos(phi);
              const vz = radius * Math.sin(phi) * Math.sin(theta);

              vertices.push(vx, vy, vz);
            }
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
          color: 0xffffff, // White
          size: 0.8,       // Smaller dots for refined look
          transparent: true,
          opacity: 0.6,
          sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        particles.rotation.y = -Math.PI / 2;
        mainGroup.add(particles);
      };
    };

    createParticleGlobe('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');

    // --- 2. OUTER WIREFRAME SHELL ---
    // This gives the "digital globe" context around the continents
    const wireGeo = new THREE.IcosahedronGeometry(100, 2); // Same radius as particles
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x333333, // Dark Grey
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const wireSphere = new THREE.Mesh(wireGeo, wireMat);
    mainGroup.add(wireSphere);

    // --- 3. ATMOSPHERE GLOW (Sprite) ---
    // Creates a faint white glow behind the globe
    const spriteMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(generateGlowTexture()),
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(300, 300, 1);
    mainGroup.add(sprite);

    // --- 4. ORBITAL RINGS ---
    // Ring 1
    const ringGeo1 = new THREE.TorusGeometry(140, 0.5, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.3 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    ring1.rotation.y = -0.2;
    mainGroup.add(ring1);

    // Ring 2 (Larger, thinner)
    const ringGeo2 = new THREE.TorusGeometry(170, 0.3, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.2 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2.2;
    ring2.rotation.y = 0.1;
    mainGroup.add(ring2);


    // --- ANIMATION ---
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;

      // Rotate Globe
      mainGroup.rotation.y += 0.002;

      // Rotate Wireframe slightly faster for parallax effect
      wireSphere.rotation.y -= 0.0005;

      // Animate Rings
      ring1.rotation.z += 0.002;
      ring1.rotation.x = Math.PI / 2 + Math.sin(time * 0.5) * 0.1;
      
      ring2.rotation.z -= 0.001;
      ring2.rotation.x = Math.PI / 2.2 + Math.cos(time * 0.3) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      spriteMaterial.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThreeLoaded]);

  // Helper to generate a simple radial gradient texture for glow
  function generateGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return canvas;
  }

  if (!isThreeLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans">
      {/* 3D Scene */}
      <div ref={mountRef} className="absolute inset-0 z-0" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-18 pointer-events-none">
        <div className="text-center space-y-4">
          {/* Loading Bar Container */}
          <div className="w-64 h-1 bg-gray-800 rounded-full mt-4 overflow-hidden mx-auto border border-gray-700">
            <div className="h-full bg-white animate-loading-bar w-1/2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
          </div>
          <h2 className="text-2xl font-bold tracking-[0.3em] text-white uppercase mt-4" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }}>
            cold starting server
          </h2>
          <h2 className="text-2xl font-bold tracking-[0.3em] text-white uppercase mt-4" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }}>
            please wait
          </h2>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;