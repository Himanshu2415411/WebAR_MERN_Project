// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, AdaptiveDpr } from '@react-three/drei';
import { ARButton, XR, useXR, useHitTest, Interactive } from '@react-three/xr';
import axios from 'axios';
import * as THREE from 'three';
import './App.css';

// --- Error Boundary Component (unchanged) ---
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    console.error("Model Error:", error);
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="thumbnail-error">
          <span>⚠️</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// 1. Model component (unchanged)
function Model({ modelPath, ...props }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  const modelRef = useRef();

  useEffect(() => {
    if (modelRef.current) {
      try {
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && Number.isFinite(maxDim)) { 
          const desiredScale = 0.8 / maxDim;
          modelRef.current.scale.set(desiredScale, desiredScale, desiredScale);
          modelRef.current.position.set(-center.x * desiredScale, -center.y * desiredScale, -center.z * desiredScale);
        }
      } catch (e) { console.error("Error scaling model:", e); }
    }
  }, [clonedScene, modelPath]);

  return <primitive ref={modelRef} object={clonedScene} {...props} />;
}

// 2. Reticle component (unchanged)
const Reticle = forwardRef((props, ref) => {
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.15, 0.2, 32]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
});
Reticle.displayName = 'Reticle';

// 3. Scene component (UPDATED: receives arScale)
function Scene({ modelKey, modelPath, placedPosition, setPlacedPosition, arScale }) {
  const { isPresenting } = useXR();
  const reticleRef = useRef();

  useHitTest((hitMatrix) => {
    if (!placedPosition && reticleRef.current) {
      hitMatrix.decompose(
        reticleRef.current.position,
        reticleRef.current.quaternion,
        reticleRef.current.scale
      );
    }
  });

  const onSelect = () => {
    if (!placedPosition && reticleRef.current) {
      const position = reticleRef.current.position.clone();
      setPlacedPosition(position);
    }
  };

  return (
    <Suspense fallback={null} key={modelKey}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
        {!isPresenting && (
          // Desktop/3D Mode
          <>
            <ModelWithControls modelPath={modelPath} />
            <AdaptiveDpr pixelated />
          </>
        )}
        {isPresenting && (
          // AR Mode
          <>
            {placedPosition ? (
              // Apply the new arScale here
              <group position={placedPosition} scale={arScale}>
                <Model modelPath={modelPath} />
              </group>
            ) : (
              <Interactive onSelect={onSelect}>
                <Reticle ref={reticleRef} />
              </Interactive>
            )}
          </>
        )}
    </Suspense>
  );
}

// 4. ModelWithControls component (unchanged)
function ModelWithControls({ modelPath }) {
  const modelRef = useRef();
  
  useEffect(() => {
    if (modelRef.current) {
      try {
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && Number.isFinite(maxDim)) {
          const scale = 2.5 / maxDim; 
          modelRef.current.scale.set(scale, scale, scale);
          modelRef.current.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        }
      } catch (e) { console.error("Error scaling main model:", e); }
    }
  }, [modelPath]);

  return (
    <group ref={modelRef}>
      <Model modelPath={modelPath} />
      <OrbitControls enablePan={true} enableZoom={true} />
    </group>
  );
}

// 5. Thumbnail Component (unchanged)
function Thumbnail({ product, isActive, onClick }) {
  return (
    <div
      className={`gallery-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(product)}
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div className="gallery-model-canvas">
        <ModelErrorBoundary>
          <Canvas camera={{ position: [0, 0, 1.5], fov: 75 }}>
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Suspense fallback={null}>
              <Model modelPath={product.modelPath} />
              <OrbitControls enableZoom={false} enablePan={false} autoRotate speed={0.5} />
            </Suspense>
          </Canvas>
        </ModelErrorBoundary>
      </div>
      <div className="gallery-item-name">{product.name}</div>
    </div>
  );
}

// --- (NEW) AR Scale Controls Component ---
// This component will be rendered *by* MainExperience
function ARControls({ setArScale }) {
  return (
    <div className="ar-controls-container">
      <button className="scale-button" onClick={() => setArScale(s => s * 1.5)}>
        +
      </button>
      <button className="scale-button" onClick={() => setArScale(s => s / 1.5)}>
        -
      </button>
    </div>
  );
}

// --- (NEW) MainExperience Component ---
// This wrapper lets us use the useXR hook to show/hide the AR controls
function MainExperience() {
  const { isPresenting } = useXR();
  const [placedPosition, setPlacedPosition] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [arScale, setArScale] = useState(1); // <-- New state for AR scale

  useEffect(() => {
    axios.get('https://webar-mern-project.onrender.com/api/products')
      .then(response => {
        if (response.data.length === 0) {
          setError('No products found in database.');
        } else {
          setProducts(response.data);
          setCurrentProduct(response.data[0]);
        }
      })
      .catch(error => {
        setError('Failed to fetch products. Check backend.');
      });
  }, []);

  // When we switch products, reset the scale and placement
  const selectProduct = (product) => {
    setCurrentProduct(product);
    setPlacedPosition(null);
    setArScale(1); // Reset scale
  };

  if (error) {
    return (
      <div className="center-message">
        <h1>Error: {error}</h1>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="center-message">
        <h1>Loading Product Catalog...</h1>
      </div>
    );
  }

  return (
    <>
      {/* The main 3D scene is now part of this component */}
      <Scene
        modelKey={currentProduct._id}
        modelPath={currentProduct.modelPath}
        placedPosition={placedPosition}
        setPlacedPosition={setPlacedPosition}
        arScale={arScale} // Pass the scale down
      />

      {/* Gallery (Top Overlay) - Renders outside the canvas */}
      <div className="product-gallery-container">
        {products.map((product) => (
          <Thumbnail
            key={product._id}
            product={product}
            isActive={currentProduct._id === product._id}
            onClick={selectProduct}
          />
        ))}
      </div>

      {/* Controls (Bottom Overlay) - Renders outside the canvas */}
      <div className="controls-container">
        <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
        <button
          className="reset-button"
          onClick={() => setPlacedPosition(null)}
        >
          Reset
        </button>
      </div>

      {/* --- NEW AR CONTROLS --- */}
      {/* Only show these buttons if we are in AR mode */}
      {isPresenting && <ARControls setArScale={setArScale} />}
    </>
  );
}

// 6. App component (This is now much simpler)
function App() {
  return (
    <div className="app-container">
      {/* Main 3D Canvas (Base Layer) */}
      <div id="canvas-container">
        <ModelErrorBoundary>
          <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
            <XR>
              {/* MainExperience contains all logic and UI */}
              <MainExperience />
            </XR>
          </Canvas>
        </ModelErrorBoundary>
      </div>
    </div>
  );
}

export default App;