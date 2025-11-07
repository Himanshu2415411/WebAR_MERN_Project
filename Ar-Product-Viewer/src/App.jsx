// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
// Import <Center> helper
import { OrbitControls, useGLTF, AdaptiveDpr, Center } from '@react-three/drei'; 
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
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
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

// 1. Model component (SIMPLIFIED - NO SCALING LOGIC)
function Model({ modelPath, ...props }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
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

// 3. Scene component (UPDATED to use <Center>)
function Scene({ modelKey, modelPath, placedPosition, setPlacedPosition, arScale, setIsPresenting }) {
  const { isPresenting } = useXR();
  const reticleRef = useRef();

  // This syncs the *internal* AR state with the *external* React state
  useEffect(() => {
    setIsPresenting(isPresenting);
  }, [isPresenting, setIsPresenting]);

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
            {/* Use <Center> to safely auto-scale and center the model */}
            <Center>
              <Model modelPath={modelPath} />
            </Center>
            <OrbitControls enablePan={true} enableZoom={true} />
            <AdaptiveDpr pixelated />
          </>
        )}
        {isPresenting && (
          // AR Mode
          <>
            {placedPosition ? (
              <group position={placedPosition} scale={arScale}>
                {/* Use <Center> here too for a good default size */}
                <Center>
                  <Model modelPath={modelPath} />
                </Center>
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

// 4. Thumbnail Component (UPDATED to use <Center>)
function Thumbnail({ product, isActive, onClick }) {
  return (
    <div
      className={`gallery-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(product)}
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div className="gallery-model-canvas">
        <ModelErrorBoundary>
          <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Suspense fallback={null}>
              {/* Use <Center> to safely scale the thumbnail model */}
              <Center>
                <Model modelPath={product.modelPath} />
              </Center>
              <OrbitControls enableZoom={false} enablePan={false} autoRotate speed={0.5} />
            </Suspense> 
          </Canvas>
        </ModelErrorBoundary>
      </div>
      <div className="gallery-item-name">{product.name}</div>
    </div>
  );
}

// 5. ARControls component (unchanged)
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

// 6. App component (This is the main fix)
function App() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [placedPosition, setPlacedPosition] = useState(null);
  const [arScale, setArScale] = useState(1);
  const [isPresenting, setIsPresenting] = useState(false); 
  // --- REMOVED THE FAULTY isARSupported STATE ---

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
    <div className="app-container">
      {/* Main 3D Canvas (Base Layer) */}
      <div id="canvas-container">
        <ModelErrorBoundary>
          <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
            <XR>
              <Scene
                modelKey={currentProduct._id}
                modelPath={currentProduct.modelPath}
                placedPosition={placedPosition}
                setPlacedPosition={setPlacedPosition}
                arScale={arScale}
                setIsPresenting={setIsPresenting} 
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
            onClick={selectProduct}
          />
        ))}
      </div>

      {/* --- Controls (Bottom Overlay) ---
          THIS IS THE FIX. We removed the faulty logic.
          The ARButton will now correctly hide itself on desktop
          and show itself on your phone.
      */}
      <div className="controls-container">
        <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
        <button
          className="reset-button"
          onClick={() => setPlacedPosition(null)}
        >
          Reset
        </button>
      </div>

      {/* AR Scale Controls (Side Overlay) */}
      {isPresenting && <ARControls setArScale={setArScale} />}
    </div>
  );
}

export default App;