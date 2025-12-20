import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import gsap from 'gsap';

interface ThreeSceneProps {
  isStarted: boolean;
  onUiUpdate: (message: string, opacity: number) => void;
  onFinalSequenceStart: () => void;
  onGameEnd: () => void;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ 
  isStarted, 
  onUiUpdate, 
  onFinalSequenceStart,
  onGameEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Game State Refs
  const gameStateRef = useRef<string>('intro');
  const messagePoolRef = useRef<string[]>([
    "MERRY CHRISTMAS",
    "I’m yours forever.",
    "Even distance cannot keep us apart.",
    "The best is yet to come.",
    "LU LIN Keep smile, life is wonderful"
  ]);
  const totalWishes = 5;
  const isTreeBlinkingRef = useRef(false);
  const blinkStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morphTargetRef = useRef<string | null>(null);
  const currentTargetPositionsRef = useRef<number[]>([]);
  const hasTriggeredRoseRef = useRef(false);
  
  // Audio Refs
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxFireworkRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Init Audio ---
    bgmRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/10/05/audio_6862534f31.mp3?filename=cinematic-atmosphere-score-2-123497.mp3');
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.6;

    sfxFireworkRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/03/10/audio_cda84d6326.mp3?filename=firework-show-short-64657.mp3');
    sfxFireworkRef.current.volume = 1.0;

    // --- Init Scene ---
    // Check initial state
    let isMobile = window.innerWidth < 768;
    
    const scene = new THREE.Scene();
    const fogColor = 0x0a1525;
    scene.fog = new THREE.FogExp2(fogColor, 0.02);
    scene.background = new THREE.Color(fogColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, isMobile ? 22 : 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    const spotLight = new THREE.SpotLight(0xffeeb1, 2);
    spotLight.position.set(0, 8, 8);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);
    const flashLight = new THREE.PointLight(0xffaa00, 0, 80);
    flashLight.position.set(0, 12, -5);
    scene.add(flashLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Post Processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.radius = 0.4;
    bloomPass.strength = 0.7; // Reduced from 1.0 to prevent overall burnout
    bloomPass.threshold = 0.2; // Increased threshold to avoid blooming mid-tones
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- Assets & Objects ---
    
    // Sparkle Texture
    const createSharpSparkleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Texture();
        const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, "rgba(255, 255, 255, 1)");
        grd.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
        grd.addColorStop(0.6, "rgba(255, 255, 255, 0.1)");
        grd.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    };
    const sparkleTexture = createSharpSparkleTexture();

    // Gift Box
    const giftGroup = new THREE.Group();
    scene.add(giftGroup);
    const boxGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const boxMat = new THREE.MeshStandardMaterial({color: 0xcc0000});
    const box = new THREE.Mesh(boxGeo, boxMat);
    giftGroup.add(box);
    const rMat = new THREE.MeshStandardMaterial({color: 0xffd700, emissive: 0x332200});
    giftGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.5), rMat));
    giftGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 2.6), rMat));
    giftGroup.scale.set(0, 0, 0);
    giftGroup.position.set(0, 1.25, 0);

    // Tree
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);
    treeGroup.scale.set(0, 0, 0);
    const particleCount = isMobile ? 4500 : 5500;
    
    const treeGeo = new THREE.BufferGeometry();
    const treePos = []; const treeCol = [];
    const initialY = new Float32Array(particleCount);
    const dissolveVel = new Float32Array(particleCount * 3);

    for(let i=0; i<particleCount; i++) {
        const t = i/particleCount; const angle = t*Math.PI*30; 
        const r = 0.1+(1-t)*4.5 + Math.sin((t*10)%1*Math.PI)*0.4;
        const spread = 0.25;
        const x = Math.cos(angle)*r+(Math.random()-0.5)*spread;
        const y = t*10-3+(Math.random()-0.5)*spread;
        const z = Math.sin(angle)*r+(Math.random()-0.5)*spread;
        treePos.push(x, y, z);
        treeCol.push(1, 0.8, 0.2);
        initialY[i] = y;
        
        dissolveVel[i*3] = (Math.random()-0.5) * 0.1;
        dissolveVel[i*3+1] = (Math.random()-0.5) * 0.1;
        dissolveVel[i*3+2] = (Math.random()-0.5) * 0.1;
    }
    treeGeo.setAttribute('position', new THREE.Float32BufferAttribute(treePos, 3));
    treeGeo.setAttribute('color', new THREE.Float32BufferAttribute(treeCol, 3));
    treeGeo.setAttribute('initialY', new THREE.BufferAttribute(initialY, 1));
    treeGeo.setAttribute('dissolveVel', new THREE.BufferAttribute(dissolveVel, 3));

    const treeMat = new THREE.PointsMaterial({
        size: isMobile ? 0.16 : 0.14, // Reduced size (from 0.2/0.18) to fix exposure
        map: sparkleTexture, 
        vertexColors: true, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false, 
        transparent: true, 
        opacity: 0.95
    });
    const treeParticles = new THREE.Points(treeGeo, treeMat);
    treeGroup.add(treeParticles);

    // Ornaments
    const ornaments: THREE.Mesh[] = [];
    const ornGeo = new THREE.SphereGeometry(isMobile ? 0.3 : 0.25, 16, 16); 
    const ornCols = [0xd40000, 0xffd700, 0xf0f0f0];
    for(let i=0; i<45; i++) {
        const t = i/45; const angle = t*Math.PI*18+Math.random(); const r = (1-t)*4.2+0.2;
        const mat = new THREE.MeshStandardMaterial({
            color: ornCols[i%3], 
            roughness: 0.2, 
            metalness: 0.9, 
            emissive: 0x331111, 
            emissiveIntensity: 0.2
        });
        const mesh = new THREE.Mesh(ornGeo, mat);
        mesh.position.set(Math.cos(angle)*r, t*9-2.5, Math.sin(angle)*r);
        mesh.userData = { isOrnament: true }; 
        treeGroup.add(mesh);
        ornaments.push(mesh);
    }

    // Star & Ring
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({color: 0xffffff})); // Reduced star size 0.5 -> 0.4
    star.position.set(0, 7.5, 0); treeGroup.add(star);
    
    // Star Light
    const starLight = new THREE.PointLight(0xffffff, 0, 20); 
    starLight.position.set(0, 7.5, 0); treeGroup.add(starLight);
    
    const ringGeo = new THREE.RingGeometry(0.6, 0.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 7.5, 0); treeGroup.add(ring);

    // Snow
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = []; const snowVel: number[] = [];
    for(let i=0; i<1500; i++) {
        snowPos.push((Math.random()-0.5)*40, (Math.random()-0.5)*40+10, (Math.random()-0.5)*40);
        snowVel.push(Math.random()*0.05+0.02);
    }
    snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
    const snowSystem = new THREE.Points(snowGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.12, map: sparkleTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending}));
    scene.add(snowSystem);

    // Effects Group
    const effectGroup = new THREE.Group();
    scene.add(effectGroup);

    // --- Helpers ---
    
    // Improved Rose Particles Algorithm
    const getRoseParticlePositions = () => {
        const positions = []; 
        const count = 3500; 
        for(let i=0; i<count; i++) {
            const u = Math.random() * Math.PI * 2; 
            const v = Math.random(); 
            const k = 3; 
            const r_base = 0.5 + 1.5 * v;
            const r_mod = 1 + 0.5 * Math.sin(k * u);
            const r = r_base * r_mod;
            const h = Math.pow(v, 1.5) * 2 - 1 + Math.cos(k*u)*0.3;
            const x = r * Math.cos(u);
            const z = r * Math.sin(u);
            const y = h * 1.5 + Math.random()*0.2; 
            const rotX = Math.PI / 4;
            const y_final = y * Math.cos(rotX) - z * Math.sin(rotX);
            const z_final = y * Math.sin(rotX) + z * Math.cos(rotX);
            positions.push(x * 1.5, y_final * 1.5, z_final * 1.5);
        }
        return positions;
    };

    // Text Particles
    const getTextParticlePositions = (message: string) => {
        const isMob = window.innerWidth < 768; // Dynamic check
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 512; 
        const ctx = canvas.getContext('2d');
        if (!ctx) return [];
        
        let fontSize = 100; 
        const maxCharsPerLine = isMob ? 12 : 20; 
        const lines = [];
        
        if (message.length > maxCharsPerLine) {
            const words = message.split(' '); let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
                if (currentLine.length + 1 + words[i].length <= maxCharsPerLine) currentLine += " " + words[i];
                else { lines.push(currentLine); currentLine = words[i]; }
            }
            lines.push(currentLine); fontSize = 80;
        } else lines.push(message);

        // Adjust font size based on number of lines to fit vertically
        if (lines.length > 3) fontSize = 60;

        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
        
        const lineHeight = fontSize * 1.2; 
        const startY = 256 - ((lines.length - 1) * lineHeight) / 2;
        
        lines.forEach((line, index) => { 
            ctx.fillText(line, 512, startY + index * lineHeight); 
        });
        
        const data = ctx.getImageData(0, 0, 1024, 512).data;
        const positions = []; 
        const step = 2; // Reverted to standard density
        
        const scale = isMob ? 0.018 : 0.05; 

        for (let y = 0; y < 512; y += step) {
            for (let x = 0; x < 1024; x += step) {
                if (data[(y * 1024 + x) * 4 + 3] > 128) {
                    positions.push((x - 512) * scale, -(y - 256) * scale, 0); 
                }
            }
        }
        return positions;
    };

    const getParticlesFromCanvas = (drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return [];
        drawFn(ctx, 256, 256);
        const data = ctx.getImageData(0, 0, 256, 256).data;
        const validPoints = [];
        for(let y=0; y<256; y+=2) {
            for(let x=0; x<256; x+=2) {
                if(data[(y*256+x)*4]>128) validPoints.push({x:(x-128)*0.08, y:-(y-128)*0.08+5, z:0});
            }
        }
        const targets = [];
        for(let i=0; i<particleCount; i++) {
            if(i < validPoints.length) {
                targets.push(validPoints[i].x, validPoints[i].y, validPoints[i].z);
            } else {
                const angle = Math.random() * Math.PI * 2; const r = 9 + Math.random() * 2;
                targets.push(Math.cos(angle)*r, 5 + (Math.random()-0.5)*5, Math.sin(angle)*r);
            }
        }
        return targets;
    };

    const drawSmiley = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 15;
        ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(85, 100, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(171, 100, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(128, 128, 70, 0.2*Math.PI, 0.8*Math.PI); ctx.stroke();
    };

    const drawHands = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "180px Arial"; ctx.fillText("🤝", w/2, h/2);
    };

    // --- Effects ---

    const createParticles = (positions: number[], type: string, startY: number, size: number, hoverTime: number) => {
        const geo = new THREE.BufferGeometry(); const posArr = new Float32Array(positions);
        const vels = []; const cols = []; const color = new THREE.Color();
        for(let i=0; i<positions.length/3; i++) {
            if(type === 'rose') {
                if(Math.random()>0.5) color.setRGB(3.0, 0.1, 0.4); else color.setRGB(1.5, 0.0, 0.1);
                vels.push((Math.random()-0.5)*0.005, (Math.random()-0.5)*0.005, (Math.random()-0.5)*0.005);
            } else {
                // Revert to original standard colors (warm mix), removing the enhanced intensity
                if(Math.random()>0.5) color.setRGB(3.0, 2.5, 0.8); 
                else color.setRGB(2.5, 1.5, 0.2);
                vels.push((Math.random()-0.5)*0.06, (Math.random()-0.5)*0.06, (Math.random()-0.5)*0.04+0.02);
            }
            cols.push(color.r, color.g, color.b);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const mat = new THREE.PointsMaterial({size:size, map:sparkleTexture, vertexColors:true, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false, opacity:1});
        const mesh = new THREE.Points(geo, mat);
        mesh.position.set(0, startY, -5);
        mesh.userData = { velocities: vels, type: type, age: 0, hoverDuration: hoverTime };
        effectGroup.add(mesh);
    };

    const createBackgroundSparks = () => {
        const pGeo = new THREE.BufferGeometry(); const pPos=[]; const pCol=[]; const pVel=[]; const color = new THREE.Color();
        for(let i=0; i<800; i++) {
            pPos.push(0, 13, -5); 
            const a=Math.random()*Math.PI*2; const s=Math.random()*0.6+0.2; const phi=Math.random()*Math.PI;
            pVel.push(Math.sin(phi)*Math.cos(a)*s, Math.cos(phi)*s, Math.sin(phi)*Math.sin(a)*s);
            color.setHSL(Math.random(), 1, 0.6); pCol.push(color.r, color.g, color.b);
        }
        pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
        pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
        const pMat = new THREE.PointsMaterial({ size: 0.2, map: sparkleTexture, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite:false, transparent: true });
        const points = new THREE.Points(pGeo, pMat);
        points.userData = { velocities: pVel, type: 'spark', drag: 0.96 };
        effectGroup.add(points);
    };

    const triggerExplosion = (type: string, content: string | undefined) => {
        const isMob = window.innerWidth < 768;

        // Re-enable flash light for ALL explosions (both rose and text)
        flashLight.intensity = 20; 
        gsap.to(flashLight, { intensity: 0, duration: 0.6 });
        
        if (type === 'rose') {
            const roseSize = isMob ? 0.12 : 0.15;
            createParticles(getRoseParticlePositions(), 'rose', 13, roseSize, 5.0);
            isTreeBlinkingRef.current = true;
            if (blinkStopTimerRef.current) clearTimeout(blinkStopTimerRef.current);
        } else if (content) {
            // Standard size for desktop (0.12), Reduced for mobile (0.055) to prevent blowout from overlap
            const textSize = isMob ? 0.055 : 0.12; 
            createParticles(getTextParticlePositions(content), 'text', 13, textSize, 4.5); 
        }
        createBackgroundSparks();
    };

    const launchFireworkSequence = (type: string, content?: string) => {
        if (sfxFireworkRef.current) {
            sfxFireworkRef.current.currentTime = 0;
            sfxFireworkRef.current.play().catch(()=>{});
        }
        const r = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshBasicMaterial({color:0xffffaa}));
        r.position.set(0,7.5,0); effectGroup.add(r);
        const tg=new THREE.BufferGeometry(); const tp=new Float32Array(60); tg.setAttribute('position',new THREE.BufferAttribute(tp,3));
        const tm=new THREE.PointsMaterial({color:0xffaa00,size:0.5,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending});
        const t=new THREE.Points(tg,tm); r.add(t);
        gsap.to(r.position, {y:13, duration:1, ease:"power2.in", onComplete:()=>{ effectGroup.remove(r); triggerExplosion(type,content); }});
    };

    // --- Sequence Controllers ---
    const animateTVOff = () => {
        gameStateRef.current = 'ended';
        gsap.to(containerRef.current, {
            scaleY: 0.005, duration: 0.2, ease: 'power2.in',
            onComplete: () => {
                gsap.to(containerRef.current, {
                    scaleX: 0, duration: 0.2, ease: 'power2.in',
                    onComplete: () => {
                       onGameEnd();
                    }
                });
            }
        });
    };

    const startDissolve = () => {
        gameStateRef.current = 'dissolving';
        onUiUpdate("", 0);
        gsap.to(ambientLight, {intensity: 0, duration: 3});
        gsap.to(dirLight, {intensity: 0, duration: 3});
        gsap.to(spotLight, {intensity: 0, duration: 3});
        
        // Wait for dissolve to look complete, then trigger text
        setTimeout(() => {
            onFinalSequenceStart();
        }, 3000);
    };

    const startHandsMorph = () => {
        morphTargetRef.current = 'hands';
        currentTargetPositionsRef.current = getParticlesFromCanvas(drawHands);
        onUiUpdate("執手偕老，歲歲年年", 1);
        gsap.to(treeParticles.material.color, {r: 1.0, g: 0.6, b: 0.6, duration: 2});
        
        // Stay for 5 seconds before dissolving
        setTimeout(startDissolve, 5000);
    };

    const startFinalMorph = () => {
        gameStateRef.current = 'morphing';
        morphTargetRef.current = 'smile';
        gsap.to([star.scale, starLight], {intensity:0, x:0, y:0, z:0, duration: 1});
        gsap.to(ring.scale, {x:0, y:0, duration: 1});
        ornaments.forEach(o => gsap.to(o.scale, {x:0, y:0, z:0, duration: 0.5}));

        currentTargetPositionsRef.current = getParticlesFromCanvas(drawSmiley);
        
        const positions = treeParticles.geometry.attributes.position.array;
        for(let i=0; i<particleCount; i++) {
             // @ts-ignore
            positions[i*3] += (Math.random()-0.5) * 8;
             // @ts-ignore
            positions[i*3+1] += (Math.random()-0.5) * 8;
             // @ts-ignore
            positions[i*3+2] += (Math.random()-0.5) * 8;
        }
        treeParticles.geometry.attributes.position.needsUpdate = true;
        onUiUpdate("願你天天開心", 1);
        gsap.to(camera.position, {x:0, y:5, z:25, duration: 3, ease:"power2.inOut"});
        gsap.to(controls.target, {x:0, y:5, z:0, duration: 3, ease:"power2.inOut"});

        setTimeout(startHandsMorph, 5000);
    };

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleInteraction = (clientX: number, clientY: number) => {
        if (gameStateRef.current === 'morphing' || gameStateRef.current === 'dissolving' || gameStateRef.current === 'ended' || hasTriggeredRoseRef.current) return;

        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        if (gameStateRef.current === 'gift_wait') {
            const intersects = raycaster.intersectObjects(giftGroup.children, true);
            if (intersects.length > 0) {
                if(sfxFireworkRef.current) {
                    sfxFireworkRef.current.volume = 0.3; 
                    sfxFireworkRef.current.currentTime = 0; 
                    sfxFireworkRef.current.play().catch(()=>{});
                }
                gameStateRef.current = 'tree_revealed';
                gsap.to(giftGroup.scale, {x:0, y:0, z:0, duration:0.5, ease:"back.in(2)"});
                gsap.to(bloomPass, {strength:4, radius:1, duration:0.3, yoyo:true, repeat:1, onComplete:()=> { bloomPass.strength=0.7; }}); // Reset to new lower default strength
                gsap.to(treeGroup.scale, {x:1, y:1, z:1, duration:2, delay:0.3, ease:"elastic.out(1,0.7)"});
                gsap.from(treeGroup.rotation, {y:Math.PI*2, duration:2, delay:0.3});
                // Target intensity reduced from 0.8 to 0.5 to further avoid over-brightness
                gsap.to(starLight, {intensity:0.5, duration:2, delay:1.5});
                onUiUpdate(`請點擊聖誕裝飾 (0/${totalWishes})`, 1);
                setTimeout(() => { if(sfxFireworkRef.current) sfxFireworkRef.current.volume = 1.0; }, 1000);
            }
        } 
        else if (gameStateRef.current === 'tree_revealed') {
            const intersects = raycaster.intersectObjects(ornaments);
            if (intersects.length > 0) {
                const obj = intersects[0].object as THREE.Mesh;
                const mat = obj.material as THREE.MeshStandardMaterial;
                gsap.to(mat, {emissiveIntensity:4, duration:0.1, yoyo:true, repeat:1});
                
                let type: string;
                let content: string | undefined;

                if (messagePoolRef.current.length > 0) {
                    const index = Math.floor(Math.random() * messagePoolRef.current.length);
                    content = messagePoolRef.current[index];
                    messagePoolRef.current.splice(index, 1);
                    type = 'text';
                    const collected = totalWishes - messagePoolRef.current.length;
                    onUiUpdate(`收集祝福 (${collected}/${totalWishes})`, 1);
                    if(messagePoolRef.current.length === 0) {
                        onUiUpdate("再次點擊，觸發奇蹟...", 1);
                    }
                } else {
                    type = 'rose';
                    hasTriggeredRoseRef.current = true;
                    onUiUpdate("", 0);
                }

                launchFireworkSequence(type, content);

                controls.autoRotate = false;
                const savePos = camera.position.clone();
                const saveTgt = controls.target.clone();
                
                const isMob = window.innerWidth < 768;
                // Camera positioning for best view of text (Mobile Z = 25, Desktop Z = 12)
                const camZ = isMob ? 25 : 12;

                gsap.to(controls.target, {x:0, y:14, z:-5, duration:1.5, ease:"power2.inOut"});
                gsap.to(camera.position, {x:0, y:8, z:camZ, duration:1.5, ease:"power2.inOut"});
                
                const waitTime = 6.5;
                gsap.to(controls.target, {x:saveTgt.x, y:saveTgt.y, z:saveTgt.z, duration:2, delay:waitTime, ease:"power2.inOut", onComplete:()=>controls.autoRotate=true});
                gsap.to(camera.position, {x:savePos.x, y:savePos.y, z:savePos.z, duration:2, delay:waitTime, ease:"power2.inOut"});
            }
        }
    };

    const onClick = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
    
    // Touch Logic
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            e.preventDefault();
            handleInteraction(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    };

    window.addEventListener('click', onClick);
    window.addEventListener('touchstart', onTouchStart, {passive: false});
    window.addEventListener('touchend', onTouchEnd, {passive: false});
    window.addEventListener('TRIGGER_TV_OFF', animateTVOff);


    // --- Animation Loop ---
    let reqId: number;
    const animate = () => {
        reqId = requestAnimationFrame(animate);
        controls.update();
        
        const delta = 0.016; 
        const time = Date.now()*0.001;

        // Tree logic
        if (gameStateRef.current === 'tree_revealed') {
            const colors = treeParticles.geometry.attributes.color;
            const initialY = treeParticles.geometry.attributes.initialY.array;
            const tempColor = new THREE.Color();
            for(let i=0; i<particleCount; i++) {
                // @ts-ignore
                const shift = Math.sin(time * 0.8 + initialY[i] * 0.3) * 0.5 + 0.5; 
                const colorGold = new THREE.Color(0xffaa00);
                const colorCyan = new THREE.Color(0x00eeff);
                const colorPink = new THREE.Color(0xff0088);
                if(shift < 0.5) tempColor.copy(colorGold).lerp(colorCyan, shift * 2);
                else tempColor.copy(colorCyan).lerp(colorPink, (shift - 0.5) * 2);
                colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
            }
            colors.needsUpdate = true;
        }

        if (isTreeBlinkingRef.current) {
            treeParticles.material.opacity = 0.5 + Math.abs(Math.sin(time * 10)) * 0.5;
        } else if (gameStateRef.current === 'tree_revealed') {
            if (treeParticles.material.opacity !== 0.95) treeParticles.material.opacity += (0.95 - treeParticles.material.opacity) * 0.05;
        }

        if (gameStateRef.current === 'morphing' && currentTargetPositionsRef.current.length > 0) {
            const positions = treeParticles.geometry.attributes.position.array;
            for(let i=0; i<particleCount; i++) {
                const targetIndex = i % (currentTargetPositionsRef.current.length / 3);
                const tx = currentTargetPositionsRef.current[targetIndex*3];
                const ty = currentTargetPositionsRef.current[targetIndex*3+1];
                const tz = currentTargetPositionsRef.current[targetIndex*3+2];
                // @ts-ignore
                positions[i*3] += (tx - positions[i*3]) * 0.02;
                // @ts-ignore
                positions[i*3+1] += (ty - positions[i*3+1]) * 0.02;
                // @ts-ignore
                positions[i*3+2] += (tz - positions[i*3+2]) * 0.02;
            }
            treeParticles.geometry.attributes.position.needsUpdate = true;
            if (morphTargetRef.current === 'smile') treeParticles.material.color.setHex(0xffcc00);
            treeParticles.material.opacity = 1; 
        }

        if (gameStateRef.current === 'dissolving') {
            const positions = treeParticles.geometry.attributes.position.array;
            const dVel = treeParticles.geometry.attributes.dissolveVel.array;
            for(let i=0; i<particleCount; i++) {
                 // @ts-ignore
                positions[i*3] += dVel[i*3];
                 // @ts-ignore
                positions[i*3+1] += dVel[i*3+1];
                 // @ts-ignore
                positions[i*3+2] += dVel[i*3+2];
            }
            treeParticles.geometry.attributes.position.needsUpdate = true;
            treeParticles.material.opacity -= 0.005;
        }

        // Effect group logic
        for(let i=effectGroup.children.length-1; i>=0; i--) {
            const obj = effectGroup.children[i] as THREE.Points;
            if(obj.userData.velocities) {
                const pos = obj.geometry.attributes.position.array;
                const vels = obj.userData.velocities;
                const type = obj.userData.type;
                
                if(type === 'text' || type === 'rose') {
                    obj.userData.age += delta;
                    if(obj.userData.age < obj.userData.hoverDuration) {
                        for(let k=0; k<pos.length/3; k++) {
                            // Reduced jitter
                            const jitter = type === 'rose' ? 0.001 : 0.005;
                            // @ts-ignore
                            pos[k*3] += (Math.random()-0.5)*jitter;
                            // @ts-ignore
                            pos[k*3+1] += (Math.random()-0.5)*jitter;
                            // @ts-ignore
                            pos[k*3+2] += (Math.random()-0.5)*jitter;
                        }
                        obj.geometry.attributes.position.needsUpdate = true;
                        if(type === 'rose') obj.rotation.y += 0.005;
                        continue;
                    }
                }
                for(let k=0; k<pos.length/3; k++) {
                     // @ts-ignore
                    pos[k*3] += vels[k*3];  
                    // @ts-ignore
                    pos[k*3+1] += vels[k*3+1];  
                    // @ts-ignore
                    pos[k*3+2] += vels[k*3+2];
                    if(type==='spark') {
                        vels[k*3]*=obj.userData.drag; vels[k*3+1]*=obj.userData.drag; vels[k*3+2]*=obj.userData.drag;
                        vels[k*3+1]-=0.008;
                    } else {
                        vels[k*3]*=0.98; vels[k*3+1]*=0.98; vels[k*3+2]*=0.98;
                        vels[k*3+1]-=0.003;
                        if(Math.random()>0.95) vels[k*3]+=(Math.random()-0.5)*0.005;
                    }
                }
                obj.geometry.attributes.position.needsUpdate = true;
                if(type==='spark' || obj.userData.age > obj.userData.hoverDuration) (obj.material as THREE.PointsMaterial).opacity-=0.008;
                if((obj.material as THREE.PointsMaterial).opacity<=0) {
                    effectGroup.remove(obj);
                    if (type === 'rose') {
                        if (blinkStopTimerRef.current) clearTimeout(blinkStopTimerRef.current);
                        blinkStopTimerRef.current = setTimeout(() => { 
                            isTreeBlinkingRef.current = false; 
                            startFinalMorph(); 
                        }, 3000); 
                    }
                }
            }
        }

        // Snow logic
        const sPos = snowSystem.geometry.attributes.position.array;
        for(let i=0; i<1500; i++) {
             // @ts-ignore
            sPos[i*3+1] -= snowVel[i]; 
             // @ts-ignore
            if(sPos[i*3+1]<-10) sPos[i*3+1]=20;
        }
        snowSystem.geometry.attributes.position.needsUpdate=true;
        if (gameStateRef.current === 'dissolving') {
            (snowSystem.material as THREE.PointsMaterial).opacity -= 0.005;
            if((snowSystem.material as THREE.PointsMaterial).opacity < 0) snowSystem.visible = false;
        }

        composer.render();
    };

    animate();

    // --- Cleanup ---
    const handleResize = () => {
        if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
        
        let isMob = window.innerWidth < 768;
        // Don't reset camera position aggressively during text show, but do update aspect
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('click', onClick);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('TRIGGER_TV_OFF', animateTVOff);
        cancelAnimationFrame(reqId);
        
        if (rendererRef.current) {
            rendererRef.current.dispose();
            if (containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
        }
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
    };
  }, []); // Run once on mount (or on reset key change)

  // Watch for start trigger
  useEffect(() => {
    if (isStarted && gameStateRef.current === 'intro') {
        gameStateRef.current = 'gift_wait';
    }
    
    if (isStarted && bgmRef.current && bgmRef.current.paused) {
         bgmRef.current.play().catch(e => console.log("Audio play failed", e));
         if(sceneRef.current) {
             const giftGroup = sceneRef.current.children.find(c => c.type === 'Group') as THREE.Group; // First group is gift
             if(giftGroup) {
                 gsap.to(giftGroup.scale, {x:1, y:1, z:1, duration:1.5, ease:"elastic.out(1,0.5)"});
             }
         }
         setTimeout(() => onUiUpdate("點擊禮物盒打開驚喜", 1), 1500);
    }
  }, [isStarted, onUiUpdate]);

  return <div ref={containerRef} className="fixed inset-0 z-0 origin-center" />;
};