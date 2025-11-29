import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { ArrowRight, Activity, Zap, TrendingUp, Trophy, Clock, Globe } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

interface ActivityItem {
  id: string;
  text: string;
  amount: string;
  type: 'BET' | 'YIELD' | 'RESOLVE';
  trackIndex: number; // 0, 1, or 2
}

const FEATURED_MARKETS = [
  { id: 0, title: "BTC > $100k", color: 0x10b981, colorHex: "#10b981", pool: "$245k" }, // Emerald
  { id: 1, title: "Somnia Mainnet", color: 0x8b5cf6, colorHex: "#8b5cf6", pool: "$512k" }, // Purple
  { id: 2, title: "Fed Rate Cut", color: 0x06b6d4, colorHex: "#06b6d4", pool: "$890k" }, // Cyan
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Interaction Refs
  const hoveredTrackRef = useRef<number | null>(null);
  const triggerRunnerRef = useRef<((trackIndex: number) => void) | null>(null);

  // UI State
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Sync UI hover to 3D Ref
  useEffect(() => {
    hoveredTrackRef.current = hoveredCard;
  }, [hoveredCard]);

  // Feed Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const trackIndex = Math.floor(Math.random() * 3);
      const isBet = Math.random() > 0.3;
      
      const newItem: ActivityItem = {
        id: Date.now().toString(),
        text: isBet ? `New Bet: ${FEATURED_MARKETS[trackIndex].title}` : `Yield Payout: Track #${trackIndex + 1}`,
        amount: isBet ? `${Math.floor(Math.random() * 500)} SOMI` : `+${(Math.random() * 5).toFixed(2)}%`,
        type: isBet ? 'BET' : 'YIELD',
        trackIndex
      };

      setFeed(prev => [newItem, ...prev].slice(0, 3));

      // Trigger 3D Runner
      if (triggerRunnerRef.current && isBet) {
        triggerRunnerRef.current(trackIndex);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // --- THREE.JS SCENE ---
  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.015);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, -20);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Enable glowing effects
    renderer.toneMapping = THREE.AdditiveToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Track Generation
    const trackCurves: THREE.CatmullRomCurve3[] = [];
    const trackMeshes: THREE.Group[] = []; // Contains the tube and the edges

    // Define 3 paths
    // Left Track
    trackCurves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2, -5, 10),
      new THREE.Vector3(-8, 0, -10),
      new THREE.Vector3(-15, 8, -40),
      new THREE.Vector3(-25, 15, -80),
    ]));
    // Center Track
    trackCurves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -5, 10),
      new THREE.Vector3(0, 2, -20),
      new THREE.Vector3(0, 8, -50),
      new THREE.Vector3(0, 20, -100),
    ]));
    // Right Track
    trackCurves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(2, -5, 10),
      new THREE.Vector3(8, 0, -10),
      new THREE.Vector3(15, 8, -40),
      new THREE.Vector3(25, 15, -80),
    ]));

    // Create Track Visuals
    trackCurves.forEach((curve, index) => {
      const group = new THREE.Group();
      const marketColor = FEATURED_MARKETS[index].color;

      // Tube Geometry (The Road)
      const geometry = new THREE.TubeGeometry(curve, 64, 1.5, 8, false);
      const material = new THREE.MeshBasicMaterial({
        color: 0x1e293b, // Dark Slate
        transparent: true,
        opacity: 0.1,
        wireframe: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const tube = new THREE.Mesh(geometry, material);
      group.add(tube);

      // Edges (Neon Lines)
      // We create two offset lines to simulate lane markings
      const points = curve.getPoints(64);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: 0x334155, // Dim default
        transparent: true, 
        opacity: 0.5,
        linewidth: 2 
      });
      
      // Creating side rails manually for better visual or just wireframe the tube
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.3 })
      );
      group.add(edges);

      // Finish Gate (Ring)
      const endPoint = points[points.length - 1];
      const tangent = curve.getTangent(1);
      const ringGeo = new THREE.TorusGeometry(3, 0.2, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: marketColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(endPoint);
      ring.lookAt(endPoint.clone().add(tangent));
      group.add(ring);

      trackMeshes.push(group);
      scene.add(group);
    });

    // 3. Runner System
    interface Runner {
        mesh: THREE.Mesh;
        trackIndex: number;
        progress: number;
        speed: number;
    }
    const runners: Runner[] = [];

    // Create a futuristic racing car with neon effects
    const createCarMesh = (color: number) => {
        const carGroup = new THREE.Group();
        
        // Sleek car body (low profile sports car shape)
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-0.6, 0);
        bodyShape.lineTo(0.6, 0);
        bodyShape.lineTo(0.5, 0.3);
        bodyShape.lineTo(-0.5, 0.3);
        bodyShape.lineTo(-0.6, 0);
        
        const bodyGeo = new THREE.BoxGeometry(1.4, 0.4, 3);
        const bodyMat = new THREE.MeshBasicMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.25;
        carGroup.add(body);
        
        // Cockpit (angular windshield)
        const cockpitGeo = new THREE.BoxGeometry(1, 0.35, 1.5);
        const cockpitMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.55, -0.3);
        carGroup.add(cockpit);
        
        // Neon underglow
        const underglowGeo = new THREE.BoxGeometry(1.6, 0.05, 3.2);
        const underglowMat = new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.9, 
          blending: THREE.AdditiveBlending 
        });
        const underglow = new THREE.Mesh(underglowGeo, underglowMat);
        underglow.position.y = 0.02;
        carGroup.add(underglow);
        
        // Side neon strips
        const stripGeo = new THREE.BoxGeometry(0.05, 0.1, 2.8);
        const stripMat = new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 1, 
          blending: THREE.AdditiveBlending 
        });
        const leftStrip = new THREE.Mesh(stripGeo, stripMat);
        leftStrip.position.set(-0.72, 0.25, 0);
        carGroup.add(leftStrip);
        
        const rightStrip = new THREE.Mesh(stripGeo, stripMat);
        rightStrip.position.set(0.72, 0.25, 0);
        carGroup.add(rightStrip);
        
        // Wheels with glowing rims
        const wheelGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
        const wheelMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const rimMat = new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.8,
          blending: THREE.AdditiveBlending 
        });
        
        const wheelPositions = [
          { x: -0.65, z: 0.9 },
          { x: 0.65, z: 0.9 },
          { x: -0.65, z: -0.9 },
          { x: 0.65, z: -0.9 },
        ];
        
        wheelPositions.forEach(pos => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.y = Math.PI / 2;
          wheel.position.set(pos.x, 0.15, pos.z);
          carGroup.add(wheel);
          
          // Glowing rim center
          const rimGeo = new THREE.CircleGeometry(0.15, 8);
          const rim = new THREE.Mesh(rimGeo, rimMat);
          rim.rotation.y = Math.PI / 2;
          rim.position.set(pos.x + (pos.x > 0 ? 0.1 : -0.1), 0.15, pos.z);
          carGroup.add(rim);
        });
        
        // Headlights (bright white with glow)
        const headlightGeo = new THREE.CircleGeometry(0.12, 8);
        const headlightMat = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        
        const leftHead = new THREE.Mesh(headlightGeo, headlightMat);
        leftHead.position.set(-0.45, 0.3, 1.52);
        carGroup.add(leftHead);
        
        const rightHead = new THREE.Mesh(headlightGeo, headlightMat);
        rightHead.position.set(0.45, 0.3, 1.52);
        carGroup.add(rightHead);
        
        // Headlight beams
        const beamGeo = new THREE.ConeGeometry(0.3, 2, 8, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({ 
          color: 0xffffee, 
          transparent: true, 
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
        
        const leftBeam = new THREE.Mesh(beamGeo, beamMat);
        leftBeam.rotation.x = -Math.PI / 2;
        leftBeam.position.set(-0.45, 0.3, 2.5);
        carGroup.add(leftBeam);
        
        const rightBeam = new THREE.Mesh(beamGeo, beamMat);
        rightBeam.rotation.x = -Math.PI / 2;
        rightBeam.position.set(0.45, 0.3, 2.5);
        carGroup.add(rightBeam);
        
        // Tail lights (red glow)
        const tailGeo = new THREE.BoxGeometry(0.5, 0.08, 0.05);
        const tailMat = new THREE.MeshBasicMaterial({ 
          color: 0xff0000,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        const tailLight = new THREE.Mesh(tailGeo, tailMat);
        tailLight.position.set(0, 0.35, -1.53);
        carGroup.add(tailLight);
        
        // Exhaust flames (animated in update loop)
        const flameGeo = new THREE.ConeGeometry(0.1, 0.5, 6);
        const flameMat = new THREE.MeshBasicMaterial({ 
          color: 0xff6600, 
          transparent: true, 
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        });
        const leftFlame = new THREE.Mesh(flameGeo, flameMat);
        leftFlame.rotation.x = Math.PI / 2;
        leftFlame.position.set(-0.3, 0.15, -1.8);
        leftFlame.name = 'flame';
        carGroup.add(leftFlame);
        
        const rightFlame = new THREE.Mesh(flameGeo, flameMat);
        rightFlame.rotation.x = Math.PI / 2;
        rightFlame.position.set(0.3, 0.15, -1.8);
        rightFlame.name = 'flame';
        carGroup.add(rightFlame);
        
        // Speed trail particles
        for (let i = 0; i < 5; i++) {
          const trailGeo = new THREE.SphereGeometry(0.08 - i * 0.01, 4, 4);
          const trailMat = new THREE.MeshBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.6 - i * 0.1,
            blending: THREE.AdditiveBlending
          });
          const trail = new THREE.Mesh(trailGeo, trailMat);
          trail.position.set(0, 0.25, -1.8 - i * 0.4);
          carGroup.add(trail);
        }
        
        // Outer glow aura
        const auraGeo = new THREE.SphereGeometry(2, 8, 8);
        const auraMat = new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.1, 
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 0.3;
        carGroup.add(aura);
        
        return carGroup;
    };

    const spawnRunner = (trackIndex: number) => {
        const color = FEATURED_MARKETS[trackIndex].color;
        const carMesh = createCarMesh(color);
        
        scene.add(carMesh);
        
        runners.push({
            mesh: carMesh as unknown as THREE.Mesh,
            trackIndex,
            progress: 0,
            speed: 0.006 + Math.random() * 0.01
        });
    };
    triggerRunnerRef.current = spawnRunner;
    
    // Random runner spawner
    const spawnRandomRunner = () => {
      const trackIndex = Math.floor(Math.random() * 3);
      spawnRunner(trackIndex);
      // Schedule next spawn randomly between 2-5 seconds
      setTimeout(spawnRandomRunner, 2000 + Math.random() * 3000);
    };
    // Start random spawning after 2 seconds
    setTimeout(spawnRandomRunner, 2000);

    // 4. Spark/Explosion System
    interface Spark {
        mesh: THREE.Mesh;
        velocity: THREE.Vector3;
        age: number;
    }
    const sparks: Spark[] = [];
    const sparkGeo = new THREE.PlaneGeometry(0.5, 0.5);

    const spawnSparks = (position: THREE.Vector3, color: number) => {
        for(let i=0; i<10; i++) {
            const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(sparkGeo, material);
            mesh.position.copy(position);
            mesh.lookAt(camera.position);
            
            scene.add(mesh);
            sparks.push({
                mesh,
                velocity: new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).multiplyScalar(0.5),
                age: 0
            });
        }
    };

    // Animation Loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // A. Update Tracks (Highlighting)
      trackMeshes.forEach((group, index) => {
         const isHovered = hoveredTrackRef.current === index;
         const color = FEATURED_MARKETS[index].color;
         
         // Pulse effect on edges if hovered
         group.children.forEach((child) => {
             if (child instanceof THREE.LineSegments) { // The edges
                 const mat = child.material as THREE.LineBasicMaterial;
                 if (isHovered) {
                     mat.color.setHex(color);
                     mat.opacity = 0.8 + Math.sin(time * 10) * 0.2;
                 } else {
                     mat.color.setHex(0x334155);
                     mat.opacity = 0.3;
                 }
             }
         });
      });

      // B. Update Runners
      for (let i = runners.length - 1; i >= 0; i--) {
          const r = runners[i];
          r.progress += r.speed;
          
          if (r.progress >= 1) {
              // Reached finish - big explosion!
              const curve = trackCurves[r.trackIndex];
              const endPoint = curve.getPoint(1);
              // Spawn more sparks for dramatic effect
              for (let j = 0; j < 3; j++) {
                spawnSparks(endPoint, FEATURED_MARKETS[r.trackIndex].color);
              }
              
              scene.remove(r.mesh);
              runners.splice(i, 1);
              continue;
          }

          const curve = trackCurves[r.trackIndex];
          const point = curve.getPoint(r.progress);
          const tangent = curve.getTangent(r.progress);

          r.mesh.position.copy(point);
          r.mesh.lookAt(point.clone().add(tangent));
          
          // Animate flames on the car
          r.mesh.children.forEach((child: THREE.Object3D) => {
            if (child.name === 'flame') {
              child.scale.z = 0.8 + Math.random() * 0.4;
              child.scale.x = 0.8 + Math.random() * 0.3;
              child.scale.y = 0.8 + Math.random() * 0.3;
            }
          });
      }

      // C. Update Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.age += 0.05;
          s.mesh.position.add(s.velocity);
          s.mesh.scale.setScalar(1 - s.age); // Shrink

          if (s.age >= 1) {
              scene.remove(s.mesh);
              sparks.splice(i, 1);
          }
      }

      // D. Camera Drift
      camera.position.y = 8 + Math.sin(time * 0.2) * 1;
      camera.lookAt(0, 0, -20);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden text-white font-sans">
      {/* 3D Container */}
      <div ref={mountRef} className="absolute inset-0 z-0" />
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] pointer-events-none z-10" />

      {/* Main UI */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
            <div>
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-2 tracking-widest uppercase">
                    <Globe size={14} /> Somnia Testnet Live
                </div>
                <div className="flex items-center gap-4 mb-2">
                    <img 
                      src="https://image.pollinations.ai/prompt/Modern%20crypto%20logo%2C%20letter%20K%20formed%20by%20three%20racing%20track%20lanes%20converging%20into%20one%20point%2C%20speed%20lines%20effect%2C%20gradient%20from%20cyan%20to%20purple%2C%20glowing%20neon%20style%2C%20dark%20background%2C%20minimalist%20vector%20design%2C%20no%20text%2C%20icon%20only%2C%20fintech%20blockchain%20aesthetic?seed=123&width=512&height=512"
                      alt="Kinetix Logo"
                      className="w-16 h-16 md:w-20 md:h-20 rounded-xl shadow-lg shadow-purple-500/30"
                    />
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
                        KINETIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">PROTOCOL</span>
                    </h1>
                </div>
                <p className="text-slate-400 max-w-md mt-2 text-lg">
                    The first yield-bearing prediction layer. <br/>
                    <span className="text-slate-500 text-sm">Collateral earns DeFi yield while you play.</span>
                </p>
                <button 
                  onClick={onEnter}
                  className="mt-6 group bg-white text-slate-950 px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-cyan-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    Enter App <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                </button>
            </div>

            {/* Sidebar Feed */}
            <div className="hidden md:block w-72 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-4 pointer-events-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                    <Activity size={12} /> Live Chain Feed
                </div>
                <div className="space-y-3">
                    {feed.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-sm animate-in fade-in slide-in-from-right-4 duration-500">
                             <div 
                                className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                                style={{ color: FEATURED_MARKETS[item.trackIndex].colorHex }}
                             />
                             <div className="flex-1 min-w-0">
                                 <div className="truncate text-slate-200">{item.text}</div>
                                 <div className="text-xs text-slate-500 font-mono">{item.amount}</div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Bottom: Featured Market "Tracks" */}
        <div className="pointer-events-auto">
             <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest justify-center md:justify-start">
                 <Trophy size={14} className="text-yellow-500"/> Featured Events
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {FEATURED_MARKETS.map((market, index) => (
                     <div 
                        key={market.id}
                        onMouseEnter={() => setHoveredCard(index)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={onEnter}
                        className={`
                            relative bg-slate-900/40 backdrop-blur-md border rounded-xl p-5 cursor-pointer transition-all duration-300 group
                            ${hoveredCard === index ? 'border-opacity-100 bg-slate-900/80 -translate-y-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]' : 'border-slate-800 border-opacity-50 hover:border-slate-700'}
                        `}
                        style={{ borderColor: hoveredCard === index ? market.colorHex : undefined }}
                     >
                         {/* Card Glow Element */}
                         <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-xl" 
                            style={{ backgroundColor: market.colorHex }}
                         />

                         <div className="flex justify-between items-start mb-2">
                             <div 
                                className="text-xs font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800"
                                style={{ color: market.colorHex }}
                             >
                                 TRACK #{index + 1}
                             </div>
                             <div className="flex items-center gap-1 text-xs text-green-400 font-mono">
                                 <TrendingUp size={12} /> APY Active
                             </div>
                         </div>
                         
                         <h3 className="text-lg font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                             {market.title}
                         </h3>
                         
                         <div className="flex items-center justify-between text-xs text-slate-400 mt-3 font-mono">
                             <span className="flex items-center gap-1"><Zap size={12}/> {market.pool} Vol</span>
                             <span className="flex items-center gap-1"><Clock size={12}/> Ends 24h</span>
                         </div>
                     </div>
                 ))}
             </div>
        </div>

      </div>
    </div>
  );
};
