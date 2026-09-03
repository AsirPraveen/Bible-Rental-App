import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RotateCcw, Play, Pause, Layers, Scale, Sparkles, BookOpen } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../config/api';

// three.js and its loaders ship with the app rather than loading from a CDN at
// runtime, so the viewer works offline and cannot be broken by a third party.
// See src/assets/three/README.md for provenance and upgrade notes.
import threeSource from '../../assets/three/three.min.json';
import orbitControlsSource from '../../assets/three/OrbitControls.json';
import gltfLoaderSource from '../../assets/three/GLTFLoader.json';

const apiUrl = API_BASE_URL;

const THREE_RUNTIME = [
  (threeSource as { src: string }).src,
  (orbitControlsSource as { src: string }).src,
  (gltfLoaderSource as { src: string }).src,
].join(';\n');
const screenWidth = Dimensions.get('window').width;

export default function ArtifactViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { artifactId } = route.params;
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);

  const [artifact, setArtifact] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const fetchArtifactDetails = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/artifacts/${artifactId}`);
        if (res.data && res.data.status === 'Success') {
          setArtifact(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching Biblical artifact details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifactDetails();
  }, [artifactId]);

  const handleResetCamera = () => {
    webViewRef.current?.injectJavaScript(`window.resetCamera(); true;`);
  };

  const handleToggleAutoRotate = () => {
    const nextVal = !autoRotate;
    setAutoRotate(nextVal);
    webViewRef.current?.injectJavaScript(`window.setAutoRotate(${nextVal}); true;`);
  };

  // Generate the customized HTML string containing Three.js + procedural engine
  const htmlContent = artifact ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body {
          margin: 0;
          overflow: hidden;
          background-color: ${theme === 'dark' ? '#0f172a' : '#f8fafc'};
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          -webkit-user-select: none;
        }
        #canvas-container {
          width: 100vw;
          height: 100vh;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
        }
        .marker {
          position: absolute;
          z-index: 10;
          width: 24px;
          height: 24px;
          margin-left: -12px;
          margin-top: -12px;
          border-radius: 50%;
          background: rgba(234, 30, 99, 0.8);
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: bold;
          font-size: 11px;
          pointer-events: auto;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          animation: pulse 2s infinite;
        }
        .marker.active {
          background: #ffeb3b;
          color: #0f172a;
          border-color: #0f172a;
          transform: scale(1.2);
          animation: none;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(234, 30, 99, 0.7);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(234, 30, 99, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(234, 30, 99, 0);
          }
        }
      </style>
      <!-- three.js r147 + OrbitControls + GLTFLoader, bundled with the app -->
      <script>${THREE_RUNTIME}</script>
    </head>
    <body>
      <div id="canvas-container"></div>
      <div id="markers-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;"></div>

      <script>
        var scene, camera, renderer, controls, mixer;
        var clock = new THREE.Clock();
        var container = document.getElementById('canvas-container');
        var markersOverlay = document.getElementById('markers-overlay');
        var activeModel = null;
        var autoRotateEnabled = true;
        var hotspots = ${JSON.stringify(artifact.hotspots || [])};
        var currentSelectedId = null;

        function init() {
          // Scene setup
          scene = new THREE.Scene();
          
          // Camera setup
          camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
          camera.position.set(0, 2.5, 7.5);

          // Renderer setup
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setPixelRatio(window.devicePixelRatio);
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.15;
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          container.appendChild(renderer.domElement);

          // Controls
          controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;
          controls.minDistance = 3.5;
          controls.maxDistance = 12;
          controls.target.set(0, 0.2, 0);
          controls.autoRotate = autoRotateEnabled;
          controls.autoRotateSpeed = 1.0;

          // Lighting
          var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
          scene.add(ambientLight);

          var dirLight1 = new THREE.DirectionalLight(0xffe6c2, 2.0);
          dirLight1.position.set(5, 8, 5);
          dirLight1.castShadow = true;
          dirLight1.shadow.mapSize.width = 1024;
          dirLight1.shadow.mapSize.height = 1024;
          dirLight1.shadow.camera.near = 0.5;
          dirLight1.shadow.camera.far = 25;
          dirLight1.shadow.bias = -0.001;
          scene.add(dirLight1);

          var dirLight2 = new THREE.DirectionalLight(0xbbe1fa, 0.8);
          dirLight2.position.set(-5, 3, -5);
          scene.add(dirLight2);

          var pointLight = new THREE.PointLight(0xffaa44, 0.8, 10);
          pointLight.position.set(0, 1.5, 0);
          scene.add(pointLight);

          // Plinth (Stand)
          var plinthGeo = new THREE.CylinderGeometry(1.6, 1.75, 0.25, 42);
          var plinthMat = new THREE.MeshStandardMaterial({
            color: ${theme === 'dark' ? '0x1e293b' : '0xe2e8f0'},
            roughness: 0.85,
            metalness: 0.15
          });
          var plinth = new THREE.Mesh(plinthGeo, plinthMat);
          plinth.position.y = -1.1;
          plinth.receiveShadow = true;
          scene.add(plinth);

          // Load Model (GLTF / GLB Loader with Fallback)
          loadModel();

          // Build Hotspot Markers in HTML Overlay
          createHotspotMarkers();

          // Event Listeners
          window.addEventListener('resize', onWindowResize);
          controls.addEventListener('start', function() {
            // User interaction halts autoRotate briefly
            if (autoRotateEnabled) {
              controls.autoRotate = false;
              clearTimeout(window.rotateTimeout);
              window.rotateTimeout = setTimeout(function() {
                if (autoRotateEnabled) controls.autoRotate = true;
              }, 4000);
            }
          });

          animate();
        }

        function loadModel() {
          var modelUrl = "${artifact.modelUrl || ''}";
          
          if (modelUrl && modelUrl.trim() !== '') {
            // Setup loading indicator
            var loadingOverlay = document.createElement('div');
            loadingOverlay.style.position = 'absolute';
            loadingOverlay.style.top = '50%';
            loadingOverlay.style.left = '50%';
            loadingOverlay.style.transform = 'translate(-50%, -50%)';
            loadingOverlay.style.color = '${theme === 'dark' ? '#94a3b8' : '#64748b'}';
            loadingOverlay.style.fontFamily = 'sans-serif';
            loadingOverlay.style.fontSize = '12px';
            loadingOverlay.style.fontWeight = 'bold';
            loadingOverlay.style.zIndex = '20';
            loadingOverlay.style.textAlign = 'center';
            loadingOverlay.innerHTML = '<div style="font-size:18px; margin-bottom:8px;">✨</div>Loading 3D specimen...';
            document.body.appendChild(loadingOverlay);

            var loader = new THREE.GLTFLoader();
            loader.load(
              modelUrl,
              function(gltf) {
                if (loadingOverlay.parentNode) document.body.removeChild(loadingOverlay);
                var model = gltf.scene;
                
                // Centering and sizing using bounding box
                var box = new THREE.Box3().setFromObject(model);
                var size = box.getSize(new THREE.Vector3());
                var center = box.getCenter(new THREE.Vector3());
                
                model.position.x += (model.position.x - center.x);
                model.position.y += (-0.2 - center.y); // center just above the plinth stand
                model.position.z += (model.position.z - center.z);
                
                var maxDim = Math.max(size.x, size.y, size.z);
                var scale = 2.2 / (maxDim || 1);
                model.scale.set(scale, scale, scale);
                
                // Traversal to activate shadow maps and customize PBR reflection properties
                model.traverse(function(node) {
                  if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                      node.material.roughness = Math.min(node.material.roughness || 0.4, 0.8);
                      node.material.metalness = Math.max(node.material.metalness || 0.0, 0.1);
                    }
                  }
                });

                // Play model animations if present
                if (gltf.animations && gltf.animations.length > 0) {
                  mixer = new THREE.AnimationMixer(model);
                  gltf.animations.forEach(function(clip) {
                    mixer.clipAction(clip).play();
                  });
                }

                scene.add(model);
                activeModel = model;
              },
              function(xhr) {
                if (xhr.lengthComputable) {
                  var percent = Math.round((xhr.loaded / xhr.total) * 100);
                  loadingOverlay.innerHTML = '<div style="font-size:18px; margin-bottom:8px;">⚡</div>Downloading 3D files: ' + percent + '%';
                }
              },
              function(error) {
                console.error('Error loading 3D GLTF model:', error);
                loadingOverlay.innerHTML = 'Failed to load model. Constructing fallback visual...';
                setTimeout(function() {
                  if (loadingOverlay.parentNode) document.body.removeChild(loadingOverlay);
                  buildProceduralModel();
                }, 1500);
              }
            );
          } else {
            // Draw procedural model fallback
            buildProceduralModel();
          }
        }

        function buildProceduralModel() {
          var modelGroup = new THREE.Group();
          var id = "${artifact.id}";

          if (id === 'ark_of_the_covenant') {
            // Shiny gold material
            var goldMaterial = new THREE.MeshStandardMaterial({
              color: 0xD4AF37,
              metalness: 0.95,
              roughness: 0.15,
              name: 'gold'
            });

            // Main Chest Box
            var chestGeo = new THREE.BoxGeometry(2.2, 1.1, 1.1);
            var chest = new THREE.Mesh(chestGeo, goldMaterial);
            chest.position.y = -0.25;
            modelGroup.add(chest);

            // Atonement Cover (Lid)
            var lidGeo = new THREE.BoxGeometry(2.3, 0.15, 1.2);
            var lid = new THREE.Mesh(lidGeo, goldMaterial);
            lid.position.y = 0.35;
            modelGroup.add(lid);

            // Gold trim borders
            var borderGeo = new THREE.BoxGeometry(2.35, 0.08, 1.25);
            var border = new THREE.Mesh(borderGeo, goldMaterial);
            border.position.y = 0.42;
            modelGroup.add(border);

            // Carrying Rings & Poles
            var poleMaterial = new THREE.MeshStandardMaterial({
              color: 0xC59B27,
              metalness: 0.9,
              roughness: 0.2
            });

            var poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.4, 16);
            
            // Left Pole
            var poleL = new THREE.Mesh(poleGeo, poleMaterial);
            poleL.rotation.z = Math.PI / 2;
            poleL.position.set(0, -0.4, 0.65);
            modelGroup.add(poleL);

            // Right Pole
            var poleR = poleL.clone();
            poleR.position.z = -0.65;
            modelGroup.add(poleR);

            // Abstract golden cherubim on lid
            var cherubMat = new THREE.MeshStandardMaterial({
              color: 0xD4AF37,
              metalness: 0.95,
              roughness: 0.1
            });
            var cherubGroupL = new THREE.Group();
            
            // Body shape
            var bodyGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.4, 12);
            var bodyL = new THREE.Mesh(bodyGeo, cherubMat);
            bodyL.position.y = 0.6;
            cherubGroupL.add(bodyL);

            // Head
            var headGeo = new THREE.SphereGeometry(0.1, 16, 16);
            var headL = new THREE.Mesh(headGeo, cherubMat);
            headL.position.y = 0.85;
            cherubGroupL.add(headL);

            // Wings kneeling/bending forward
            var wingGeo = new THREE.BoxGeometry(0.04, 0.5, 0.35);
            var wingL = new THREE.Mesh(wingGeo, cherubMat);
            wingL.position.set(0.05, 0.75, 0);
            wingL.rotation.z = -Math.PI / 6;
            cherubGroupL.add(wingL);

            cherubGroupL.position.set(-0.8, 0, 0);
            cherubGroupL.rotation.y = -Math.PI / 2;
            modelGroup.add(cherubGroupL);

            // Right Cherub facing left
            var cherubGroupR = cherubGroupL.clone();
            cherubGroupR.position.x = 0.8;
            cherubGroupR.rotation.y = Math.PI / 2;
            modelGroup.add(cherubGroupR);

          } else if (id === 'noahs_ark') {
            // Rustic dark wood material
            var woodMaterial = new THREE.MeshStandardMaterial({
              color: 0x4E3629,
              roughness: 0.85,
              metalness: 0.1
            });
            var deckMaterial = new THREE.MeshStandardMaterial({
              color: 0x5C4033,
              roughness: 0.9,
              metalness: 0.05
            });

            // Main barge hull
            var hullGeo = new THREE.BoxGeometry(3.0, 0.6, 0.9);
            var hull = new THREE.Mesh(hullGeo, woodMaterial);
            hull.position.y = -0.3;
            modelGroup.add(hull);

            // Sloped bow & stern wedge shapes
            var endGeo = new THREE.BoxGeometry(0.6, 0.6, 0.9);
            
            var bow = new THREE.Mesh(endGeo, woodMaterial);
            bow.position.set(1.6, -0.2, 0);
            bow.rotation.z = -Math.PI / 6;
            modelGroup.add(bow);

            var stern = new THREE.Mesh(endGeo, woodMaterial);
            stern.position.set(-1.6, -0.2, 0);
            stern.rotation.z = Math.PI / 6;
            modelGroup.add(stern);

            // Middle & Upper deck house
            var houseGeo = new THREE.BoxGeometry(2.4, 0.55, 0.75);
            var house = new THREE.Mesh(houseGeo, deckMaterial);
            house.position.y = 0.15;
            modelGroup.add(house);

            // Roof with a small slope
            var roofGeo = new THREE.BoxGeometry(2.45, 0.08, 0.8);
            var roof = new THREE.Mesh(roofGeo, woodMaterial);
            roof.position.y = 0.44;
            modelGroup.add(roof);

            // Tiny window slot details
            var windowMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            var winGeo = new THREE.BoxGeometry(0.04, 0.05, 0.77);
            for(var i=-0.9; i<=0.9; i+=0.4) {
              var win = new THREE.Mesh(winGeo, windowMat);
              win.position.set(i, 0.32, 0);
              modelGroup.add(win);
            }

            // Door on the side
            var doorMat = new THREE.MeshStandardMaterial({ color: 0x2B1A0A, roughness: 0.9 });
            var doorGeo = new THREE.BoxGeometry(0.35, 0.45, 0.05);
            var door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(-0.6, -0.1, 0.46);
            modelGroup.add(door);

          } else if (id === 'menorah') {
            // Shiny gold material
            var goldMat = new THREE.MeshStandardMaterial({
              color: 0xD4AF37,
              metalness: 0.95,
              roughness: 0.12
            });

            // Base stand (cone + cylinder)
            var baseGeo = new THREE.CylinderGeometry(0.3, 0.6, 0.2, 24);
            var base = new THREE.Mesh(baseGeo, goldMat);
            base.position.y = -0.95;
            modelGroup.add(base);

            // Central Shaft
            var shaftGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 16);
            var shaft = new THREE.Mesh(shaftGeo, goldMat);
            shaft.position.y = 0.05;
            modelGroup.add(shaft);

            // Curved Branches (we build three sets of concentric arcs using torus/cylinders)
            // Branch offsets
            var branchOffsets = [0.35, 0.6, 0.85];
            var branchHeights = [0.55, 0.75, 0.95];

            branchOffsets.forEach(function(offset, idx) {
              var height = branchHeights[idx];
              // Nested U-shape using torus curve or cylinder segments
              // Left Branch segment
              var curveLGeo = new THREE.CylinderGeometry(0.035, 0.035, height, 12);
              var branchL = new THREE.Mesh(curveLGeo, goldMat);
              branchL.position.set(-offset, height/2 - 0.5, 0);
              modelGroup.add(branchL);

              // Right Branch segment
              var branchR = branchL.clone();
              branchR.position.x = offset;
              modelGroup.add(branchR);

              // Connecting bottom horizontal cylinder
              var connectorGeo = new THREE.CylinderGeometry(0.035, 0.035, offset * 2, 12);
              var connector = new THREE.Mesh(connectorGeo, goldMat);
              connector.rotation.z = Math.PI / 2;
              connector.position.y = height/2 - 0.5 - height/2;
              modelGroup.add(connector);
            });

            // 7 Cups at the top
            var cupGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.12, 16);
            var positionsX = [-0.85, -0.6, -0.35, 0, 0.35, 0.6, 0.85];
            var heightsY = [0.45, 0.5, 0.55, 0.95, 0.55, 0.5, 0.45]; // Matches branch ends + shaft top

            positionsX.forEach(function(x, idx) {
              var y = heightsY[idx];
              var cup = new THREE.Mesh(cupGeo, goldMat);
              cup.position.set(x, y + 0.02, 0);
              modelGroup.add(cup);

              // Add a small flame sphere that glows
              var flameGeo = new THREE.SphereGeometry(0.04, 8, 8);
              var flameMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00 });
              var flame = new THREE.Mesh(flameGeo, flameMat);
              flame.position.set(x, y + 0.12, 0);
              flame.scale.set(1, 1.7, 1); // elongate to look like a flame
              modelGroup.add(flame);

              // Add point light at center lamp
              if (idx === 3) {
                var lampLight = new THREE.PointLight(0xff6600, 1.2, 4);
                lampLight.position.set(x, y + 0.2, 0);
                modelGroup.add(lampLight);
              }
            });

          } else if (id === 'tabernacle_of_moses') {
            // Rectangular tent structure
            var frameMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
            var coverMat1 = new THREE.MeshStandardMaterial({ color: 0x1E3A8A, roughness: 0.9 }); // Blue
            var coverMat2 = new THREE.MeshStandardMaterial({ color: 0x7C3AED, roughness: 0.9 }); // Purple
            var goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.1 });

            // Main sanctuary structure
            var tentGeo = new THREE.BoxGeometry(2.4, 1.2, 1.2);
            var tent = new THREE.Mesh(tentGeo, frameMat);
            tent.position.y = -0.2;
            modelGroup.add(tent);

            // Layered coverings (draped sheets)
            var coverGeo = new THREE.BoxGeometry(2.44, 0.1, 1.24);
            var cover = new THREE.Mesh(coverGeo, coverMat1);
            cover.position.y = 0.42;
            modelGroup.add(cover);

            var innerCoverGeo = new THREE.BoxGeometry(1.6, 0.1, 1.26);
            var innerCover = new THREE.Mesh(innerCoverGeo, coverMat2);
            innerCover.position.set(-0.3, 0.48, 0);
            modelGroup.add(innerCover);

            // 5 Pillars at the entrance (right side)
            for (var p = -0.5; p <= 0.5; p += 0.25) {
              var pillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
              var pillar = new THREE.Mesh(pillarGeo, goldMat);
              pillar.position.set(1.2, -0.2, p);
              modelGroup.add(pillar);
            }

          } else if (id === 'solomons_temple') {
            // White stone material
            var stoneMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.9 });
            var bronzeMat = new THREE.MeshStandardMaterial({ color: 0xA16207, metalness: 0.85, roughness: 0.25 });
            var goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.1 });

            // Main sanctuary (Heikal)
            var mainBlockGeo = new THREE.BoxGeometry(2.0, 1.4, 1.1);
            var mainBlock = new THREE.Mesh(mainBlockGeo, stoneMat);
            mainBlock.position.set(-0.2, -0.1, 0);
            modelGroup.add(mainBlock);

            // Holy of Holies (Kodesh Hakodashim - rear block)
            var rearGeo = new THREE.BoxGeometry(1.0, 1.4, 1.1);
            var rearBlock = new THREE.Mesh(rearGeo, stoneMat);
            rearBlock.position.set(-1.2, -0.1, 0);
            modelGroup.add(rearBlock);

            // Portico (Ulam - entrance porch)
            var porchGeo = new THREE.BoxGeometry(0.6, 1.7, 1.3);
            var porch = new THREE.Mesh(porchGeo, stoneMat);
            porch.position.set(0.8, 0.05, 0);
            modelGroup.add(porch);

            // Gold detailing on roof
            var roofGoldGeo = new THREE.BoxGeometry(3.2, 0.06, 1.15);
            var roofGold = new THREE.Mesh(roofGoldGeo, goldMat);
            roofGold.position.y = 0.65;
            modelGroup.add(roofGold);

            // Two bronze pillars: Jachin & Boaz at entrance porch (front right)
            var pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
            
            var jachin = new THREE.Mesh(pillarGeo, bronzeMat);
            jachin.position.set(1.2, -0.2, 0.4);
            modelGroup.add(jachin);

            var boaz = jachin.clone();
            boaz.position.z = -0.4;
            modelGroup.add(boaz);

            // Add decorative globes on pillars
            var globeGeo = new THREE.SphereGeometry(0.12, 12, 12);
            var globeJ = new THREE.Mesh(globeGeo, bronzeMat);
            globeJ.position.set(1.2, 0.45, 0.4);
            modelGroup.add(globeJ);

            var globeB = globeJ.clone();
            globeB.position.z = -0.4;
            modelGroup.add(globeB);

          } else if (id === 'high_priests_breastplate') {
            // Gold filigree base plate
            var goldPlateMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.15 });
            var plateGeo = new THREE.BoxGeometry(1.5, 1.5, 0.08);
            var plate = new THREE.Mesh(plateGeo, goldPlateMat);
            plate.rotation.x = Math.PI / 8; // Tilt slightly
            modelGroup.add(plate);

            // 12 Gemstones arranged in 4 rows of 3 columns
            var gemColors = [
              0xEF4444, 0xF59E0B, 0x10B981, // Ruby, Topaz, Emerald
              0x06B6D4, 0x3B82F6, 0x1D4ED8, // Turquoise, Sapphire, Diamond (Blue)
              0xF59E0B, 0x8B5CF6, 0xEC4899, // Amber, Amethyst, Pink Quartz
              0x0D9488, 0x111827, 0x84CC16  // Beryl, Onyx, Jasper
            ];

            var gemGeo = new THREE.BoxGeometry(0.24, 0.22, 0.06);
            var index = 0;
            for (var row = 0; row < 4; row++) {
              for (var col = 0; col < 3; col++) {
                var gemMat = new THREE.MeshStandardMaterial({
                  color: gemColors[index],
                  emissive: gemColors[index],
                  emissiveIntensity: 0.35,
                  roughness: 0.05,
                  metalness: 0.9
                });
                var gem = new THREE.Mesh(gemGeo, gemMat);
                // Grid positioning
                var posX = -0.42 + col * 0.42;
                var posY = 0.48 - row * 0.32;
                gem.position.set(posX, posY, 0.06);
                gem.rotation.x = Math.PI / 8;
                modelGroup.add(gem);
                index++;
              }
            }

            // Gold chain details at top corners
            var chainMat = new THREE.MeshStandardMaterial({ color: 0xC59B27, metalness: 0.9, roughness: 0.2 });
            var chainLGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
            var chainL = new THREE.Mesh(chainLGeo, chainMat);
            chainL.position.set(-0.7, 0.8, -0.1);
            chainL.rotation.z = Math.PI / 6;
            modelGroup.add(chainL);

            var chainR = chainL.clone();
            chainR.position.x = 0.7;
            chainR.rotation.z = -Math.PI / 6;
            modelGroup.add(chainR);

          } else if (id === 'altar_of_burnt_offering') {
            var bronzeMat = new THREE.MeshStandardMaterial({ color: 0x854D0E, metalness: 0.8, roughness: 0.3 });
            var hornMat = new THREE.MeshStandardMaterial({ color: 0x713F12, metalness: 0.8, roughness: 0.25 });
            var grateMat = new THREE.MeshStandardMaterial({ color: 0x3F3F46, metalness: 0.9, roughness: 0.5 });

            // Main Altar body
            var bodyGeo = new THREE.BoxGeometry(2.0, 1.0, 2.0);
            var altarBody = new THREE.Mesh(bodyGeo, bronzeMat);
            altarBody.position.y = -0.3;
            modelGroup.add(altarBody);

            // Grating (recessed inside)
            var grateGeo = new THREE.BoxGeometry(1.8, 0.04, 1.8);
            var grate = new THREE.Mesh(grateGeo, grateMat);
            grate.position.y = 0.15;
            modelGroup.add(grate);

            // Four horns on the corners
            var hornGeo = new THREE.ConeGeometry(0.12, 0.34, 4);
            var positions = [
              [-0.95, 0.35, -0.95],
              [0.95, 0.35, -0.95],
              [-0.95, 0.35, 0.95],
              [0.95, 0.35, 0.95]
            ];
            positions.forEach(function(pos) {
              var horn = new THREE.Mesh(hornGeo, hornMat);
              horn.position.set(pos[0], pos[1], pos[2]);
              modelGroup.add(horn);
            });

          } else if (id === 'bronze_serpent') {
            var woodMat = new THREE.MeshStandardMaterial({ color: 0x78350F, roughness: 0.9 });
            var bronzeMat = new THREE.MeshStandardMaterial({ color: 0xB45309, metalness: 0.85, roughness: 0.2 });

            // Wooden pole
            var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 12);
            var pole = new THREE.Mesh(poleGeo, woodMat);
            pole.position.y = 0.1;
            modelGroup.add(pole);

            // Helical/Coiled serpent wrapped around the pole
            // We group small bronze segments along a spiral path
            var coilGroup = new THREE.Group();
            for (var t = 0; t < 28; t++) {
              var angle = t * 0.72;
              var r = 0.11;
              var x = Math.cos(angle) * r;
              var z = Math.sin(angle) * r;
              var y = -1.0 + (t / 28) * 2.2;
              
              var segmentGeo = new THREE.SphereGeometry(0.048, 8, 8);
              var segment = new THREE.Mesh(segmentGeo, bronzeMat);
              segment.position.set(x, y, z);
              coilGroup.add(segment);

              // Head at the top
              if (t === 27) {
                var headGeo = new THREE.SphereGeometry(0.07, 8, 8);
                var head = new THREE.Mesh(headGeo, bronzeMat);
                head.position.set(x + 0.02, y + 0.05, z);
                coilGroup.add(head);
              }
            }
            coilGroup.position.y = 0.1;
            modelGroup.add(coilGroup);

          } else if (id === 'table_of_showbread') {
            var goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.15 });
            var breadMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.95 });

            // Tabletop
            var tableGeo = new THREE.BoxGeometry(1.8, 0.08, 1.0);
            var table = new THREE.Mesh(tableGeo, goldMat);
            table.position.y = -0.1;
            modelGroup.add(table);

            // Table legs
            var legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.8, 12);
            var offsets = [
              [-0.8, -0.5, -0.4],
              [0.8, -0.5, -0.4],
              [-0.8, -0.5, 0.4],
              [0.8, -0.5, 0.4]
            ];
            offsets.forEach(function(offset) {
              var leg = new THREE.Mesh(legGeo, goldMat);
              leg.position.set(offset[0], offset[1], offset[2]);
              modelGroup.add(leg);
            });

            // stacks of showbread (two stacks of 6 loaves)
            var loafGeo = new THREE.SphereGeometry(0.14, 12, 12);
            // Left stack
            for (var i = 0; i < 6; i++) {
              var loaf = new THREE.Mesh(loafGeo, breadMat);
              loaf.scale.set(1, 0.45, 1);
              loaf.position.set(-0.35, -0.02 + i * 0.08, 0);
              modelGroup.add(loaf);
            }
            // Right stack
            for (var i = 0; i < 6; i++) {
              var loaf = new THREE.Mesh(loafGeo, breadMat);
              loaf.scale.set(1, 0.45, 1);
              loaf.position.set(0.35, -0.02 + i * 0.08, 0);
              modelGroup.add(loaf);
            }

          } else if (id === 'moses_staff') {
            var woodMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.95 });

            // Staff main shaft
            var staffGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.5, 12);
            var staff = new THREE.Mesh(staffGeo, woodMat);
            staff.position.y = 0.1;
            modelGroup.add(staff);

            // Hook / Crook top
            // Using small rotated cylinders to create the curve
            for (var i = 0; i < 8; i++) {
              var angle = (i / 8) * Math.PI * 0.8;
              var curGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8);
              var cur = new THREE.Mesh(curGeo, woodMat);
              // Circular offset math
              var r = 0.15;
              var x = Math.sin(angle) * r;
              var y = 1.25 + Math.cos(angle) * r;
              cur.position.set(x, y, 0);
              cur.rotation.z = -angle;
              modelGroup.add(cur);
            }

          } else if (id === 'jesus_cross') {
            var woodMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.95 });
            var signMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.8 });

            // Vertical beam
            var vertGeo = new THREE.BoxGeometry(0.18, 2.7, 0.18);
            var vertBeam = new THREE.Mesh(vertGeo, woodMat);
            vertBeam.position.y = 0.25;
            modelGroup.add(vertBeam);

            // Horizontal crossbar
            var horizGeo = new THREE.BoxGeometry(1.8, 0.16, 0.16);
            var horizBeam = new THREE.Mesh(horizGeo, woodMat);
            horizBeam.position.set(0, 0.8, 0);
            modelGroup.add(horizBeam);

            // Inscription sign (Titulus Crucis)
            var signGeo = new THREE.BoxGeometry(0.48, 0.18, 0.03);
            var sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(0, 1.4, 0.1);
            modelGroup.add(sign);

          } else if (id === 'crown_of_thorns') {
            var branchMat = new THREE.MeshStandardMaterial({ color: 0x3F2A1D, roughness: 0.9 });
            var thornMat = new THREE.MeshStandardMaterial({ color: 0x541212, roughness: 0.9 });

            // Crown base ring (Torus)
            var ringGeo = new THREE.TorusGeometry(0.72, 0.07, 10, 48);
            var ring = new THREE.Mesh(ringGeo, branchMat);
            ring.rotation.x = Math.PI / 2.2; // Tilt flat in scene
            modelGroup.add(ring);

            // Add sharp spikes pointing outward
            var spikeGeo = new THREE.ConeGeometry(0.02, 0.16, 4);
            for (var a = 0; a < 24; a++) {
              var angle = (a / 24) * Math.PI * 2;
              var r = 0.72;
              var x = Math.cos(angle) * r;
              var y = Math.sin(angle) * r * 0.3; // Flat ellipse projection
              var z = Math.sin(angle) * r * 0.9;
              
              var spike = new THREE.Mesh(spikeGeo, thornMat);
              spike.position.set(x, y, z);
              // Orient spike pointing away from center
              spike.rotation.z = angle + Math.PI / 2;
              spike.rotation.x = (Math.random() - 0.5) * 0.5;
              modelGroup.add(spike);
            }

          } else if (id === 'empty_tomb') {
            var rockMat = new THREE.MeshStandardMaterial({ color: 0x6B7280, roughness: 0.95 });
            var darkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

            // Main Cave Stone Tomb Block
            var tombGeo = new THREE.BoxGeometry(2.4, 1.4, 1.4);
            var tomb = new THREE.Mesh(tombGeo, rockMat);
            tomb.position.y = -0.25;
            modelGroup.add(tomb);

            // Hollow door opening (Dark portal representing open tomb)
            var doorGeo = new THREE.BoxGeometry(0.55, 0.85, 0.05);
            var door = new THREE.Mesh(doorGeo, darkMat);
            door.position.set(0.2, -0.25, 0.7);
            modelGroup.add(door);

            // Large circular rolling stone (Moved aside to the left)
            var discGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 24);
            var stone = new THREE.Mesh(discGeo, rockMat);
            stone.rotation.x = Math.PI / 2; // Roll on side
            stone.position.set(-0.8, -0.3, 0.85);
            modelGroup.add(stone);

          } else if (id === 'last_supper_table') {
            var tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 });
            var metalMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.9, roughness: 0.2 }); // Golden cup
            var breadMat = new THREE.MeshStandardMaterial({ color: 0xCB997E, roughness: 0.95 });

            // Dinner table
            var tableGeo = new THREE.BoxGeometry(2.8, 0.08, 1.2);
            var table = new THREE.Mesh(tableGeo, tableWoodMat);
            table.position.y = -0.15;
            modelGroup.add(table);

            // 4 legs
            var legGeo = new THREE.BoxGeometry(0.08, 0.8, 0.08);
            var offsets = [
              [-1.3, -0.55, -0.4],
              [1.3, -0.55, -0.4],
              [-1.3, -0.55, 0.4],
              [1.3, -0.55, 0.4]
            ];
            offsets.forEach(function(o) {
              var leg = new THREE.Mesh(legGeo, tableWoodMat);
              leg.position.set(o[0], o[1], o[2]);
              modelGroup.add(leg);
            });

            // Golden Cup (Chalise)
            var cupGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.12, 12);
            var cup = new THREE.Mesh(cupGeo, metalMat);
            cup.position.set(0, -0.05, 0.1);
            modelGroup.add(cup);

            // Bread loaf
            var breadGeo = new THREE.SphereGeometry(0.08, 10, 10);
            var bread = new THREE.Mesh(breadGeo, breadMat);
            bread.scale.set(1.4, 0.6, 0.8);
            bread.position.set(0.2, -0.07, 0.08);
            modelGroup.add(bread);

          } else if (id === 'galilee_boat') {
            var boatWoodMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 });
            var canvasMat = new THREE.MeshStandardMaterial({ color: 0xF1F5F9, roughness: 0.9 });

            // Hull Base
            var baseGeo = new THREE.BoxGeometry(2.2, 0.25, 0.9);
            var base = new THREE.Mesh(baseGeo, boatWoodMat);
            base.position.y = -0.6;
            modelGroup.add(base);

            // Side Walls
            var wallLGeo = new THREE.BoxGeometry(2.2, 0.5, 0.05);
            var wallL = new THREE.Mesh(wallLGeo, boatWoodMat);
            wallL.position.set(0, -0.4, 0.45);
            modelGroup.add(wallL);

            var wallR = wallL.clone();
            wallR.position.z = -0.45;
            modelGroup.add(wallR);

            // Bow (front point)
            var bowGeo = new THREE.ConeGeometry(0.5, 0.5, 4);
            var bow = new THREE.Mesh(bowGeo, boatWoodMat);
            bow.rotation.z = -Math.PI / 2;
            bow.position.set(1.3, -0.4, 0);
            bow.scale.set(1, 1, 1.8);
            modelGroup.add(bow);

            // Mast
            var mastGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.8, 10);
            var mast = new THREE.Mesh(mastGeo, boatWoodMat);
            mast.position.set(-0.2, 0.2, 0);
            modelGroup.add(mast);

            // Sail fabric
            var sailGeo = new THREE.BoxGeometry(0.02, 1.1, 0.85);
            var sail = new THREE.Mesh(sailGeo, canvasMat);
            sail.position.set(-0.2, 0.5, 0);
            modelGroup.add(sail);

          } else if (id === 'wedding_jars') {
            // Stoneware jars
            var stoneJarMat = new THREE.MeshStandardMaterial({ color: 0x78716C, roughness: 0.85 });
            var jarGeo = new THREE.CylinderGeometry(0.3, 0.44, 0.9, 16);
            
            // Left Jar
            var jar1 = new THREE.Mesh(jarGeo, stoneJarMat);
            jar1.position.set(-0.6, -0.3, 0);
            modelGroup.add(jar1);

            // Center Jar (Miraculous Glowing Blue/Wine Purple Inside)
            var jar2 = new THREE.Mesh(jarGeo, stoneJarMat);
            jar2.position.set(0, -0.3, 0.1);
            modelGroup.add(jar2);

            // Add glowing water/wine sphere at the top mouth of center jar
            var waterGeo = new THREE.SphereGeometry(0.24, 12, 12);
            var waterMat = new THREE.MeshBasicMaterial({ color: 0x9D174D }); // Wine dark pink
            var water = new THREE.Mesh(waterGeo, waterMat);
            water.position.set(0, 0.18, 0.1);
            water.scale.set(1, 0.1, 1);
            modelGroup.add(water);

            // Glowing light inside jar2
            var jarLight = new THREE.PointLight(0xec4899, 1.5, 3);
            jarLight.position.set(0, 0.3, 0.1);
            modelGroup.add(jarLight);

            // Right Jar
            var jar3 = new THREE.Mesh(jarGeo, stoneJarMat);
            jar3.position.set(0.6, -0.3, 0);
            modelGroup.add(jar3);

          } else if (id === 'loaves_and_fish') {
            var basketMat = new THREE.MeshStandardMaterial({ color: 0xCA8A04, roughness: 0.9 });
            var breadMat = new THREE.MeshStandardMaterial({ color: 0xCB997E, roughness: 0.95 });
            var fishMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });

            // Basket plate
            var basketGeo = new THREE.CylinderGeometry(0.85, 0.75, 0.08, 20);
            var basket = new THREE.Mesh(basketGeo, basketMat);
            basket.position.y = -0.85;
            modelGroup.add(basket);

            // 5 Loaves stacked
            var loafGeo = new THREE.SphereGeometry(0.15, 10, 10);
            var positions = [
              [-0.25, -0.78, 0],
              [-0.1, -0.78, 0.25],
              [0.1, -0.78, -0.15],
              [-0.05, -0.72, 0.05],
              [-0.2, -0.72, 0.15]
            ];
            positions.forEach(function(pos) {
              var loaf = new THREE.Mesh(loafGeo, breadMat);
              loaf.scale.set(1.4, 0.6, 0.9);
              loaf.position.set(pos[0], pos[1], pos[2]);
              modelGroup.add(loaf);
            });

            // 2 Fish lying next to them
            var fishL = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.35, 4), fishMat);
            fishL.rotation.z = -Math.PI / 3;
            fishL.rotation.x = Math.PI / 6;
            fishL.position.set(0.35, -0.78, 0.15);
            modelGroup.add(fishL);

            var fishR = fishL.clone();
            fishR.position.set(0.2, -0.78, -0.25);
            fishR.rotation.z = -Math.PI / 4;
            modelGroup.add(fishR);

          } else if (id === 'romans_armor') {
            var steelMat = new THREE.MeshStandardMaterial({ color: 0xD1D5DB, metalness: 0.95, roughness: 0.08 });
            var redMat = new THREE.MeshStandardMaterial({ color: 0x991B1B, roughness: 0.7 });
            var woodStandMat = new THREE.MeshStandardMaterial({ color: 0x78350F, roughness: 0.9 });

            // Stand
            var standGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
            var stand = new THREE.Mesh(standGeo, woodStandMat);
            stand.position.y = -0.2;
            modelGroup.add(stand);

            var standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 16), woodStandMat);
            standBase.position.y = -1.0;
            modelGroup.add(standBase);

            // Breastplate torso
            var chestGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.8, 16);
            var breastplate = new THREE.Mesh(chestGeo, steelMat);
            breastplate.position.y = 0.1;
            modelGroup.add(breastplate);

            // Helmet
            var helmetGeo = new THREE.SphereGeometry(0.16, 16, 16);
            var helmet = new THREE.Mesh(helmetGeo, steelMat);
            helmet.position.y = 0.65;
            modelGroup.add(helmet);

            var plumeGeo = new THREE.BoxGeometry(0.04, 0.14, 0.22);
            var plume = new THREE.Mesh(plumeGeo, redMat);
            plume.position.set(0, 0.8, 0);
            modelGroup.add(plume);

            // Shield standing beside
            var shieldGeo = new THREE.BoxGeometry(0.08, 1.2, 0.65);
            var shield = new THREE.Mesh(shieldGeo, redMat);
            shield.position.set(-0.6, -0.3, 0.4);
            shield.rotation.y = Math.PI / 5;
            modelGroup.add(shield);

            var bossGeo = new THREE.SphereGeometry(0.08, 12, 12);
            var boss = new THREE.Mesh(bossGeo, steelMat);
            boss.position.set(-0.65, -0.3, 0.4);
            boss.scale.set(1, 1, 0.3);
            modelGroup.add(boss);

          } else if (id === 'peters_net') {
            var netMat = new THREE.MeshStandardMaterial({ color: 0x78350F, wireframe: true });
            
            // Draped net geometry (multiple nested wireframe cones/cylinders)
            var netGeo1 = new THREE.CylinderGeometry(0.7, 0.85, 0.4, 16, 8, true);
            var net1 = new THREE.Mesh(netGeo1, netMat);
            net1.position.y = -0.6;
            modelGroup.add(net1);

            var netGeo2 = new THREE.CylinderGeometry(0.5, 0.72, 0.35, 12, 6, true);
            var net2 = new THREE.Mesh(netGeo2, netMat);
            net2.position.set(-0.1, -0.4, 0.15);
            modelGroup.add(net2);

          } else if (id === 'pauls_chains') {
            var chainMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.4 });
            
            // 5 interlocking torus rings forming a chain draped in a curve
            var linkGeo = new THREE.TorusGeometry(0.24, 0.05, 8, 20);
            
            var link1 = new THREE.Mesh(linkGeo, chainMat);
            link1.position.set(-0.6, -0.3, 0);
            modelGroup.add(link1);

            var link2 = new THREE.Mesh(linkGeo, chainMat);
            link2.position.set(-0.35, -0.45, 0.05);
            link2.rotation.y = Math.PI / 2.5;
            modelGroup.add(link2);

            var link3 = new THREE.Mesh(linkGeo, chainMat);
            link3.position.set(-0.05, -0.5, 0.1);
            modelGroup.add(link3);

            var link4 = new THREE.Mesh(linkGeo, chainMat);
            link4.position.set(0.25, -0.45, 0.05);
            link4.rotation.y = -Math.PI / 2.5;
            modelGroup.add(link4);

            var link5 = new THREE.Mesh(linkGeo, chainMat);
            link5.position.set(0.5, -0.3, 0);
            modelGroup.add(link5);

          } else {
            // General placeholder (a beautiful glowing dodecahedron)
            var geometry = new THREE.DodecahedronGeometry(0.8);
            var material = new THREE.MeshStandardMaterial({
              color: 0x3b82f6,
              roughness: 0.2,
              metalness: 0.8
            });
            var mesh = new THREE.Mesh(geometry, material);
            modelGroup.add(mesh);
          }

          scene.add(modelGroup);
          activeModel = modelGroup;
        }

        function createHotspotMarkers() {
          hotspots.forEach(function(hs) {
            var marker = document.createElement('div');
            marker.className = 'marker';
            marker.id = 'marker-' + hs.id;
            marker.innerHTML = '●';
            marker.addEventListener('click', function(e) {
              e.stopPropagation();
              selectHotspot(hs.id);
            });
            markersOverlay.appendChild(marker);
          });
        }

        function selectHotspot(id) {
          if (currentSelectedId === id) return;
          currentSelectedId = id;

          // Toggle active class on HTML markers
          var markers = document.querySelectorAll('.marker');
          markers.forEach(function(m) {
            m.classList.remove('active');
          });

          var activeEl = document.getElementById('marker-' + id);
          if (activeEl) {
            activeEl.classList.add('active');
          }

          // Raycast/Pan target to selected hotspot position
          var targetHotspot = hotspots.find(function(h) { return h.id === id; });
          if (targetHotspot) {
            var pos = targetHotspot.position;
            // Smoothly tween controls target to the hotspot using a simple lerp
            var startTarget = controls.target.clone();
            var endTarget = new THREE.Vector3(pos[0], pos[1] + 0.1, pos[2]);
            
            var duration = 40; // frames
            var frame = 0;
            
            function tweenTarget() {
              if (frame < duration) {
                frame++;
                var t = frame / duration;
                // Ease out cubic
                t = 1 - Math.pow(1 - t, 3);
                controls.target.lerpVectors(startTarget, endTarget, t);
                setTimeout(tweenTarget, 16);
              }
            }
            tweenTarget();
          }

          // Send message to React Native screen
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'select_hotspot',
            id: id
          }));
        }

        function updateMarkersPosition() {
          if (!camera || !renderer) return;
          
          var width = window.innerWidth;
          var height = window.innerHeight;

          hotspots.forEach(function(hs) {
            var wp = new THREE.Vector3(hs.position[0], hs.position[1], hs.position[2]);
            
            // Apply model's current rotation to coordinates
            if (activeModel) {
              wp.applyEuler(activeModel.rotation);
              wp.applyQuaternion(activeModel.quaternion);
            }

            wp.project(camera);

            var x = (wp.x * 0.5 + 0.5) * width;
            var y = (-(wp.y * 0.5) + 0.5) * height;

            var el = document.getElementById('marker-' + hs.id);
            if (el) {
              // Hide markers if behind camera
              if (wp.z > 1) {
                el.style.display = 'none';
              } else {
                el.style.display = 'flex';
                el.style.transform = 'translate3d(' + Math.round(x) + 'px, ' + Math.round(y) + 'px, 0)';
              }
            }
          });
        }

        // Global functions exposed to React Native
        window.resetCamera = function() {
          controls.target.set(0, 0.2, 0);
          camera.position.set(0, 2.5, 7.5);
          if (activeModel) {
            activeModel.rotation.set(0, 0, 0);
          }
          var markers = document.querySelectorAll('.marker');
          markers.forEach(function(m) {
            m.classList.remove('active');
          });
          currentSelectedId = null;
        };

        window.setAutoRotate = function(enabled) {
          autoRotateEnabled = enabled;
          controls.autoRotate = enabled;
        };

        function onWindowResize() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
          requestAnimationFrame(animate);
          
          var delta = clock.getDelta();
          if (mixer) mixer.update(delta);
          
          // Slowly rotate model itself if auto-rotate is enabled
          if (autoRotateEnabled && activeModel && !controls.autoRotate) {
             // Slowly pivot model if user isn't holding controls
          }

          controls.update();
          updateMarkersPosition();
          renderer.render(scene, camera);
        }

        window.onload = function () {
          try {
            if (typeof THREE === 'undefined') {
              throw new Error('3D engine failed to load.');
            }
            init();
          } catch (err) {
            // Surface the failure to React Native rather than showing an
            // empty canvas with no explanation.
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'viewer_error',
                message: (err && err.message) || 'Could not start the 3D viewer.'
              }));
            }
          }
        };
      </script>
    </body>
    </html>
  ` : '';

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'select_hotspot') {
        const hs = artifact.hotspots.find((h: any) => h.id === data.id);
        if (hs) setSelectedHotspot(hs);
      } else if (data.type === 'viewer_error') {
        setViewerError(data.message || 'Could not start the 3D viewer.');
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  const handleSelectHotspot = (hs: any) => {
    setSelectedHotspot(hs);
    webViewRef.current?.injectJavaScript(`
      if (typeof selectHotspot === 'function') { selectHotspot(${JSON.stringify(hs.id)}); }
      true;
    `);
  };

  const handleClearHotspot = () => {
    setSelectedHotspot(null);
    webViewRef.current?.injectJavaScript(`
      var markers = document.querySelectorAll('.marker');
      markers.forEach(function(m) { m.classList.remove('active'); });
      currentSelectedId = null;
      true;
    `);
  };

  if (loading) {
    return <LoadingScreen message="Loading 3D specimen..." />;
  }

  if (!artifact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Artifact not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* 3D Canvas WebView Section */}
      <View style={styles.viewerContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webView}
          javaScriptEnabled={true}
          scrollEnabled={false}
          bounces={false}
          onMessage={handleMessage}
        />

        {viewerError && (
          <View style={styles.viewerErrorOverlay}>
            <Text style={styles.viewerErrorTitle}>3D view unavailable</Text>
            <Text style={styles.viewerErrorText}>{viewerError}</Text>
            <Text style={styles.viewerErrorText}>
              The artifact details below are still available to read.
            </Text>
          </View>
        )}

        {/* Floating Top Bar (Controls) */}
        <View style={styles.topControls}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circularBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.titleOverlay}>{artifact.name}</Text>
          <TouchableOpacity onPress={handleResetCamera} style={styles.circularBtn}>
            <RotateCcw size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Floating Instructions */}
        <View style={styles.instructionOverlay}>
          <Sparkles size={13} color={colors.tint} style={{ marginRight: 4 }} />
          <Text style={styles.instructionText}>Drag to rotate • Pinch to zoom • Tap dots to learn</Text>
        </View>

        {/* Floating Auto-Rotate Toggle */}
        <TouchableOpacity onPress={handleToggleAutoRotate} style={styles.rotateToggleBtn}>
          {autoRotate ? (
            <View style={styles.row}>
              <Pause size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.rotateToggleText}>Pause</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Play size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.rotateToggleText}>Rotate</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Details Bottom Sheet Section */}
      <View style={styles.detailsSheet}>
        {selectedHotspot ? (
          // Hotspot Detail Panel
          <View style={styles.hotspotPanel}>
            <View style={styles.hotspotHeader}>
              <View style={styles.row}>
                <View style={[styles.colorIndicator, { backgroundColor: selectedHotspot.color }]} />
                <Text style={styles.hotspotTitle}>{selectedHotspot.label}</Text>
              </View>
              <TouchableOpacity onPress={handleClearHotspot} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.hotspotBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.hotspotDetail}>{selectedHotspot.detail}</Text>
            </ScrollView>
          </View>
        ) : (
          // General Details Panel
          <ScrollView style={styles.scrollInfo} showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoContent}>

            {/* Bible Verse Header */}
            <View style={styles.verseBox}>
              <BookOpen size={16} color="#EA1E63" style={{ marginRight: 6 }} />
              <Text style={styles.verseReference}>{artifact.reference}</Text>
            </View>

            {/* Description */}
            <Text style={styles.descriptionText}>{artifact.description}</Text>

            {/* Points of Interest — the hotspots, browsable without hunting
                for the dots on the model itself */}
            {artifact.hotspots?.length > 0 && (
              <View style={styles.poiSection}>
                <Text style={styles.poiHeading}>Points of Interest</Text>
                <View style={styles.poiRow}>
                  {artifact.hotspots.map((hs: any) => (
                    <TouchableOpacity
                      key={hs.id}
                      style={styles.poiChip}
                      activeOpacity={0.75}
                      onPress={() => handleSelectHotspot(hs)}
                    >
                      <View style={[styles.poiDot, { backgroundColor: hs.color || colors.tint }]} />
                      <Text style={styles.poiChipText} numberOfLines={1}>{hs.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Specs Grid */}
            <View style={styles.specsGrid}>
              <View style={styles.specCard}>
                <Scale size={18} color={colors.tint} />
                <Text style={styles.specTitle}>Dimensions</Text>
                <Text style={styles.specValue}>{artifact.dimensions || 'Unknown'}</Text>
              </View>

              <View style={styles.specCard}>
                <Layers size={18} color={colors.tint} />
                <Text style={styles.specTitle}>Materials</Text>
                <Text style={styles.specValue}>{(artifact.materials || []).join(', ') || 'Unknown'}</Text>
              </View>
            </View>

            {/* Did You Know Fact */}
            {artifact.funFact && (
              <View style={styles.factBox}>
                <Sparkles size={16} color={colors.tint} style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.factTitle}>Did you know?</Text>
                  <Text style={styles.factText}>{artifact.funFact}</Text>
                </View>
              </View>
            )}

          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  poiSection: {
    marginBottom: 16,
  },
  poiHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  poiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  poiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  poiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  poiChipText: {
    fontSize: 12.5,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  viewerContainer: {
    height: '52%',
    backgroundColor: colors.theme === 'dark' ? '#0f172a' : '#f8fafc',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  viewerErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  viewerErrorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  viewerErrorText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  topControls: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.theme === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleOverlay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    backgroundColor: colors.theme === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  instructionOverlay: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.theme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  instructionText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rotateToggleBtn: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: colors.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    elevation: 2,
    zIndex: 10,
  },
  rotateToggleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsSheet: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    marginTop: -16,
  },
  scrollInfo: {
    flex: 1,
  },
  infoContent: {
    padding: 20,
    paddingBottom: 40,
  },
  verseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.theme === 'dark' ? 'rgba(234, 30, 99, 0.08)' : 'rgba(234, 30, 99, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 30, 99, 0.15)',
  },
  verseReference: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EA1E63',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  specCard: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  specTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  factBox: {
    flexDirection: 'row',
    backgroundColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(20, 108, 148, 0.06)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 108, 148, 0.1)',
  },
  factTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.tint,
    marginBottom: 2,
  },
  factText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  hotspotPanel: {
    flex: 1,
    padding: 20,
  },
  hotspotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  hotspotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  hotspotBody: {
    flex: 1,
  },
  hotspotDetail: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.tint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
