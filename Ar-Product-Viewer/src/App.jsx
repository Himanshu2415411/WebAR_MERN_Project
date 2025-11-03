// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import { ARButton, XR, useXR, useHitTest, Interactive } from '@react-three/xr';
import axios from 'axios';
import './App.css';

// 1. Model component (unchanged)
function Model({ modelPath, ...props }) {
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);
  useEffect(() => {
    Object.values(actions).forEach(action => {
      action.play();
      action.paused = true;
    });
  }, [actions]);
  return <primitive object={scene} scale={0.5} {...props} />;
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

// 3. Scene component (unchanged)
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
            <Model modelPath={modelPath} position={[0, -0.5, 0]} />
            <OrbitControls />
          </>
        )}
        {isPresenting && (
          <>
            {placedPosition ? (
              <group position={placedPosition}>
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
    </>
  );
}

// 4. App component (This is where all the changes are)
function App() {
  const [placedPosition, setPlacedPosition] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  
  // --- NEW STATE ---
  // We'll store the *entire* selected product object here
  const [currentProduct, setCurrentProduct] = useState(null);
  // -----------------

  useEffect(() => {
    // RIGHT
      axios.get('https://10.81.64.117:5001/api/products') // Make sure your IP is correct!
      .then(response => {
        console.log('Products fetched:', response.data);
        if (response.data.length === 0) {
          setError('No products found in database.');
        } else {
          setProducts(response.data);
          // Set the first product as the default
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

  // --- UPDATED LOADING LOGIC ---
  // We wait for currentProduct, not just the list
  if (!currentProduct) {
    return (
      <div className="center-message">
        <h1>Loading Product Catalog from Database...</h1>
      </div>
    );
  }
  // -----------------------------

  return (
    <>
      <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
      
      <button 
        className="reset-button"
        onClick={() => setPlacedPosition(null)}
      >
        Reset Placement
      </button>

      {/* --- NEW PRODUCT SELECTOR UI --- */}
      <div className="product-selector">
        {products.map((product) => (
          <button
            key={product._id}
            // Add an 'active' class if this is the selected product
            className={`product-button ${currentProduct._id === product._id ? 'active' : ''}`}
            onClick={() => {
              setCurrentProduct(product); // Set this as the new product
              setPlacedPosition(null);    // Reset placement
            }}
          >
            {product.name}
          </button>
        ))}
      </div>
      {/* ------------------------------- */}

      <div id="canvas-container">
        <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
          <XR>
            {/* Pass the selected product's path to the scene */}
            <Scene 
              modelPath={currentProduct.modelPath} 
              placedPosition={placedPosition} 
              setPlacedPosition={setPlacedPosition} 
            />
          </XR>
        </Canvas>
      </div>
    </>
  );
}

export default App;