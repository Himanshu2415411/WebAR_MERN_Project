// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import { ARButton, XR, useXR, useHitTest, Interactive } from '@react-three/xr';
import axios from 'axios';
import * as THREE from 'three';
import './App.css';

// --- (NEW) Error Boundary Component ---
// This will catch crashes from bad 3D models
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
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
// ------------------------------------

// 1. Model component
function Model({ modelPath, position = [0, 0, 0], scale = 1, animate = false, ...props }) {
  // useGLTF.preload(modelPath); // This can help, but let's be safe
  const { scene, animations } = useGLTF(modelPath);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  const { actions } = useAnimations(animations, clonedScene);
  const modelRef = useRef();

  useEffect(() => {
    Object.values(actions).forEach(action => {
      action.play();
      action.paused = !animate; // Simpler logic
    });
  }, [actions, animate]);

  useEffect(() => {
    // This effect runs to center and scale the model
    if (modelRef.current) {
      // Use a try...catch block to prevent crashes
      try {
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        
        let desiredScale = 1;
        if (maxDim > 0 && Number.isFinite(maxDim)) { 
          desiredScale = 0.8 / maxDim; // Scale to fit
        }
        
        modelRef.current.scale.set(desiredScale, desiredScale, desiredScale);
        modelRef.current.position.set(-center.x * desiredScale, -center.y * desiredScale, -center.z * desiredScale);
      } catch (e) {
        console.error("Error scaling model:", e);
      }
    }
  }, [clonedScene, modelPath]); // Re-run when the model changes

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

// 3. Scene component (main 3D/AR view)
function Scene({ modelPath, placedPosition, setPlacedPosition }) {
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
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <Suspense fallback={null}>
        {!isPresenting && (
          <>
            <Model modelPath={modelPath} position={[0, -0.5, 0]} animate={false} />
            <OrbitControls enablePan={true} enableZoom={true} />
          </>
        )}
        {isPresenting && (
          <>
            {placedPosition ? (
              <group position={placedPosition}>
                <Model modelPath={modelPath} animate={false} />
              </group>
            ) : (
              <Interactive onSelect={onSelect}>
                <Reticle ref={reticleRef} />
              </Interactive>
            )}
          </>
        )}
      </Suspense>
    </>
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
        {/* We wrap the Canvas in our new Error Boundary */}
        <ModelErrorBoundary>
          <Canvas camera={{ position: [0, 0, 1.5], fov: 75 }}>
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Suspense fallback={null}>
              <Model modelPath={product.modelPath} animate={false} />
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
        console.log('Products fetched:', response.data);
        if (response.data.length === 0) {
          setError('No products found in database.');
        } else {
          setProducts(response.data);
          setCurrentProduct(response.data[0]);
        }
      })
      .catch(error => {
        console.error('Error fetching products:', error);
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
        <h1>Loading Product Catalog from Database...</h1>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Main 3D Canvas (Base Layer) */}
      <div id="canvas-container">
        {/* We wrap the main scene in an error boundary too */}
        <ModelErrorBoundary>
          <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
            <XR>
              <Scene
                modelPath={currentProduct.modelPath}
                placedPosition={placedPosition}
                setPlacedPosition={setPlacedPosition}
              />
            </XR>
          </Canvas>
        </ModelErrorBoundary>
      </div>

      {/* Gallery (Top Overlay) */}
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

      {/* Controls (Bottom Overlay) */}
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