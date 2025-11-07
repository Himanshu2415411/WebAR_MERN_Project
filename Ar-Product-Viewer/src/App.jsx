// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, AdaptiveDpr } from '@react-three/drei';
import { ARButton, XR, useXR, useHitTest, Interactive } from '@react-three/xr';
import axios from 'axios';
import * as THREE from 'three';
import './App.css';

// --- (NEW) Error Boundary Component ---
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

// 1. Model component (SIMPLIFIED TO PREVENT CRASHES)
function Model({ modelPath, ...props }) {
  const { scene } = useGLTF(modelPath);
  // We use a clone so that the main model and thumbnail don't share the same object
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  
  // Note: We've removed the complex scaling logic that was crashing
  // We will control scale from the <Scene> and <Thumbnail> components
  
  return <primitive object={clonedScene} {...props} />;
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

// 3. Scene component (main 3D/AR view)
// We add a 'key' to force a re-render when the model changes
function Scene({ modelKey, modelPath, placedPosition, setPlacedPosition }) {
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
            {/* We add <Bounds> to auto-center and scale the main model */}
            <ModelWithControls modelPath={modelPath} />
            <AdaptiveDpr pixelated />
          </>
        )}
        {isPresenting && (
          // AR Mode
          <>
            {placedPosition ? (
              <group position={placedPosition}>
                <Model modelPath={modelPath} scale={0.01} /> {/* Start AR models very small */}
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

// (NEW) Wrapper for main model to handle controls and centering
function ModelWithControls({ modelPath }) {
  const modelRef = useRef();
  
  // This hook helps auto-scale and center the main model
  useEffect(() => {
    if (modelRef.current) {
      try {
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0 && Number.isFinite(maxDim)) {
          const scale = 2.5 / maxDim; // Fit to a 2.5 unit box
          modelRef.current.scale.set(scale, scale, scale);
          modelRef.current.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        }
      } catch (e) {
        console.error("Error scaling main model:", e);
      }
    }
  }, [modelPath]);

  return (
    <group ref={modelRef}>
      <Model modelPath={modelPath} />
      <OrbitControls enablePan={true} enableZoom={true} />
    </group>
  );
}

// 4. Thumbnail Component
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

// 5. App component
function App() {
  const [placedPosition, setPlacedPosition] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);

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
    <div className="app-container">
      {/* Gallery (Top) */}
      <div className="product-gallery-container">
        {products.map((product) => (
          <Thumbnail
            key={product._id}
            product={product}
            isActive={currentProduct._id === product._id}
            onClick={() => {
              setCurrentProduct(product);
              setPlacedPosition(null); 
            }}
          />
        ))}
      </div>

      {/* Main 3D Canvas (Middle) */}
      <div id="canvas-container">
        <ModelErrorBoundary>
          <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
            <XR>
              <Scene
                modelKey={currentProduct._id} /* Add key to force re-render */
                modelPath={currentProduct.modelPath}
                placedPosition={placedPosition}
                setPlacedPosition={setPlacedPosition}
              />
            </XR>
          </Canvas>
        </ModelErrorBoundary>
      </div>

      {/* Controls (Bottom) */}
      <div className="controls-container">
        <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
        <button
          className="reset-button"
          onClick={() => setPlacedPosition(null)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default App;