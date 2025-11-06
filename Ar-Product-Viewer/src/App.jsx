// src/App.jsx

import React, { Suspense, useEffect, useState, useRef, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import { ARButton, XR, useXR, useHitTest, Interactive } from '@react-three/xr';
import axios from 'axios';
import * as THREE from 'three';
import './App.css';

// 1. Model component (Modified to expose controls for thumbnails)
function Model({ modelPath, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, animate = false, ...props }) {
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);
  const modelRef = useRef();

  useEffect(() => {
    Object.values(actions).forEach(action => {
      if (animate) {
        action.play();
        action.paused = false;
      } else {
        action.play(); // Play once to reset
        action.paused = true; // Then pause
      }
    });

    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const desiredScale = 0.8 / maxDim; 

      modelRef.current.position.set(-center.x * desiredScale, -center.y * desiredScale, -center.z * desiredScale);
      modelRef.current.scale.set(desiredScale, desiredScale, desiredScale);
    }

  }, [actions, animate, scene]);

  return <primitive ref={modelRef} object={scene.clone()} {...props} />;
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
          // Desktop/3D Mode
          <>
            <Model modelPath={modelPath} position={[0, -0.5, 0]} />
            <OrbitControls enablePan={true} enableZoom={true} />
          </>
        )}
        {isPresenting && (
          // AR Mode
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

// (NEW) Thumbnail Component - Renders a mini 3D model
function Thumbnail({ product, isActive, onClick }) {
  return (
    <div
      className={`gallery-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(product)}
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div className="gallery-model-canvas">
        <Canvas camera={{ position: [0, 0, 3], fov: 75 }}>
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Suspense fallback={null}>
            <Model modelPath={product.modelPath} animate={false} />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate speed={0.5} />
          </Suspense>
        </Canvas>
      </div>
      <div className="gallery-item-name">{product.name}</div>
    </div>
  );
}


// 4. App component
function App() {
  const [placedPosition, setPlacedPosition] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);

  useEffect(() => {
    // Make sure to use your *LIVE* render URL here
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
    <>
      {/* --- (NEW) Product Gallery Container --- */}
      <div className="product-gallery-container">
        {products.map((product) => (
          <Thumbnail
            key={product._id}
            product={product}
            isActive={currentProduct._id === product._id}
            onClick={() => {
              setCurrentProduct(product);
              setPlacedPosition(null); // Reset placement when changing model
            }}
          />
        ))}
      </div>

      {/* --- Main 3D Canvas --- */}
      <div id="canvas-container">
        <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
          <XR>
            <Scene
              modelPath={currentProduct.modelPath}
              placedPosition={placedPosition}
              setPlacedPosition={setPlacedPosition}
            />
          </XR>
        </Canvas>
      </div>

      {/* --- Bottom Controls Bar --- */}
      <div className="controls-container">
        {/* The AR Button will be put here */}
        <ARButton sessionInit={{ requiredFeatures: ['hit-test'] }} />
        {/* The Reset Button is here */}
        <button
          className="reset-button"
          onClick={() => setPlacedPosition(null)}
        >
          Reset
        </button>
      </div>
    </>
  );
}

export default App;