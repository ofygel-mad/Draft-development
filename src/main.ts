import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// =========================================================
// 1. СИСТЕМА ТЕМ И ПАЛИТР (АТМОСФЕРНАЯ ПРАВДА)
// =========================================================

type ThemeConfig = {
    skyTop: number;
    skyBottom: number;
    fogColor: number;
    ambientLight: number;
    mainLight: number;
    accentLight: number;
    meshColor: number;
    wireframeColor: number;
    pointsColor: number;
    particlesColor: number;
    bloomStrength: number;
    wireOpacity: number;
    pointsOpacity: number;
    meshRoughness: number;
    meshMetalness: number;
};

const themes: Record<string, ThemeConfig> = {
    dawn: {
        skyTop: 0x6f7ea1,
        skyBottom: 0xf2c9b0,
        fogColor: 0xa6a9c4,
        ambientLight: 0xb8c2d6,
        mainLight: 0xffc58f,
        accentLight: 0x8eb6ff,
        meshColor: 0x1c2333,
        wireframeColor: 0xb9c7ea,
        pointsColor: 0xffddb8,
        particlesColor: 0xcfe6ff,
        bloomStrength: 0.45,
        wireOpacity: 0.08,
        pointsOpacity: 0.22,
        meshRoughness: 0.6,
        meshMetalness: 0.3
    },
    day: {
        skyTop: 0x85b7e8,
        skyBottom: 0xd9ecff,
        fogColor: 0xc7def5,
        ambientLight: 0xe8f2ff,
        mainLight: 0xffffff,
        accentLight: 0xaed4ff,
        meshColor: 0x19324d,
        wireframeColor: 0x9fc2e8,
        pointsColor: 0xf8fbff,
        particlesColor: 0xdff4ff,
        bloomStrength: 0.12,
        wireOpacity: 0.05,
        pointsOpacity: 0.12,
        meshRoughness: 0.85, // Днем материал более матовый, раскрывает форму
        meshMetalness: 0.1
    },
    dusk: {
        skyTop: 0x3a4d7a,
        skyBottom: 0xffb06b,
        fogColor: 0x7f5a73,
        ambientLight: 0x806b7f,
        mainLight: 0xff935c,
        accentLight: 0x7ea6ff,
        meshColor: 0x241326,
        wireframeColor: 0xf3a1a0,
        pointsColor: 0xffd3a8,
        particlesColor: 0xffb38a,
        bloomStrength: 0.5,
        wireOpacity: 0.1,
        pointsOpacity: 0.28,
        meshRoughness: 0.5,
        meshMetalness: 0.45 // Теплые длинные спекуляры
    },
    night: {
        skyTop: 0x040814,
        skyBottom: 0x0d1730,
        fogColor: 0x0d1630,
        ambientLight: 0x1b2441,
        mainLight: 0x6e8fdc,
        accentLight: 0x2d5bff,
        meshColor: 0x070b16,
        wireframeColor: 0x3560c8,
        pointsColor: 0x8fd0ff,
        particlesColor: 0x7db8ff,
        bloomStrength: 0.28,
        wireOpacity: 0.09,
        pointsOpacity: 0.2,
        meshRoughness: 0.35,
        meshMetalness: 0.6 // Холодный, скользкий, глубокий материал
    }
};

function getThemeByTime(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 'dawn';
    if (hour >= 9 && hour < 17) return 'day';
    if (hour >= 17 && hour < 21) return 'dusk';
    return 'night';
}

let currentThemeKey = getThemeByTime();

// =========================================================
// 2. ИНИЦИАЛИЗАЦИЯ СЦЕНЫ И КУПОЛА НЕБА
// =========================================================

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(themes[currentThemeKey].fogColor, 0.015);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 8, 48); // Чуть поднял камеру для лучшей перспективы

const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!document.body.contains(canvas)) document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// ClearColor больше не важен, так как есть купол неба
renderer.setClearColor(0x000000); 

// --- ГРАДИЕНТНЫЙ КУПОЛ (SKY DOME) ---
const skyGeo = new THREE.SphereGeometry(600, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    uniforms: {
        topColor: { value: new THREE.Color(themes[currentThemeKey].skyTop) },
        bottomColor: { value: new THREE.Color(themes[currentThemeKey].skyBottom) }
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
            // Мягкий градиент от горизонта (чуть ниже нуля) до верха
            float h = normalize(vWorldPosition).y;
            float t = smoothstep(-0.15, 0.4, h);
            gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
    `,
    side: THREE.BackSide,
    fog: false // Небо не должно затягиваться туманом, оно фон
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);

// =========================================================
// 3. ОСВЕЩЕНИЕ И ПОСТ-ОБРАБОТКА
// =========================================================

const ambientLightObj = new THREE.AmbientLight(themes[currentThemeKey].ambientLight, 1.0);
scene.add(ambientLightObj);

const mainLightObj = new THREE.DirectionalLight(themes[currentThemeKey].mainLight, 1.2);
mainLightObj.position.set(-30, 40, -20);
scene.add(mainLightObj);

const accentLightObj = new THREE.DirectionalLight(themes[currentThemeKey].accentLight, 1.5);
accentLightObj.position.set(40, -10, 20);
scene.add(accentLightObj);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    themes[currentThemeKey].bloomStrength, 
    0.15, 0.35 
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// =========================================================
// 4. ГЕОМЕТРИЯ (ТЕРРАЙН И ЧАСТИЦЫ)
// =========================================================

const geometry = new THREE.PlaneGeometry(280, 150, 85, 45);
const positions = geometry.attributes.position;
const initialZ: number[] = [];

for (let i = 0; i < positions.count; i++) {
    const z = (Math.random() - 0.5) * 5.0; 
    positions.setZ(i, z);
    initialZ.push(z);
}
geometry.computeVertexNormals();

const meshMaterial = new THREE.MeshStandardMaterial({
    color: themes[currentThemeKey].meshColor,
    roughness: themes[currentThemeKey].meshRoughness,
    metalness: themes[currentThemeKey].meshMetalness,
    flatShading: true, 
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
});
const surface = new THREE.Mesh(geometry, meshMaterial);

const wireMaterial = new THREE.MeshBasicMaterial({
    color: themes[currentThemeKey].wireframeColor, 
    wireframe: true,
    transparent: true,
    opacity: themes[currentThemeKey].wireOpacity, 
    blending: THREE.AdditiveBlending
});
const wireframe = new THREE.Mesh(geometry, wireMaterial);

const pointsMaterial = new THREE.PointsMaterial({
    color: themes[currentThemeKey].pointsColor, 
    size: 0.12, 
    transparent: true,
    opacity: themes[currentThemeKey].pointsOpacity,
    blending: THREE.AdditiveBlending
});
const surfacePoints = new THREE.Points(geometry, pointsMaterial);

const terrainGroup = new THREE.Group();
terrainGroup.add(surface);
terrainGroup.add(wireframe);
terrainGroup.add(surfacePoints);
terrainGroup.rotation.x = -Math.PI / 2.15;
terrainGroup.position.y = -10;
scene.add(terrainGroup);

const particleCount = 60; 
const particleGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pVel: THREE.Vector3[] = []; 
const pBaseVel: THREE.Vector3[] = []; 

for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 200;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 30 + 10;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    
    const vel = new THREE.Vector3(
        -(Math.random() * 0.04 + 0.01), 
        (Math.random() * 0.01 + 0.005),   
        (Math.random() * 0.02 + 0.01)    
    );
    pVel.push(vel.clone());
    pBaseVel.push(vel.clone());
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

const pMat = new THREE.PointsMaterial({
    color: themes[currentThemeKey].particlesColor, 
    size: 0.35, 
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const particles = new THREE.Points(particleGeo, pMat);
scene.add(particles);

// =========================================================
// 5. ИНТЕРАКТИВ И СМЕНА ТЕМ
// =========================================================

// Функция для установки таргета (анимация сделает остальное в цикле)
function applyTheme(themeName: string) {
    if (themes[themeName]) currentThemeKey = themeName;
}

const createUI = () => {
    const uiContainer = document.createElement('div');
    uiContainer.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 1000; display: flex; gap: 10px; font-family: sans-serif;';
    
    Object.keys(themes).forEach(key => {
        const btn = document.createElement('button');
        btn.innerText = key.toUpperCase();
        btn.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer; backdrop-filter: blur(5px); transition: 0.3s;';
        
        if (key === currentThemeKey) btn.style.background = 'rgba(255,255,255,0.4)';

        btn.onclick = () => {
            applyTheme(key);
            Array.from(uiContainer.children).forEach(c => (c as HTMLElement).style.background = 'rgba(255,255,255,0.1)');
            btn.style.background = 'rgba(255,255,255,0.4)';
        };
        uiContainer.appendChild(btn);
    });
    document.body.appendChild(uiContainer);
};
createUI();

const mouse = new THREE.Vector2(0, 0); 
const targetMouse = new THREE.Vector2(0, 0); 
let isMouseActive = false; 

const raycaster = new THREE.Raycaster();
const invisiblePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ visible: false })
);
invisiblePlane.rotation.x = -Math.PI / 2.15;
invisiblePlane.position.y = -10;
scene.add(invisiblePlane);

window.addEventListener('mousemove', (event) => {
    isMouseActive = true; 
    targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('mouseout', () => {
    isMouseActive = false; 
    targetMouse.set(0, 0); 
});
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================
// 6. ЦИКЛ АНИМАЦИИ (С ИНТЕРПОЛЯЦИЕЙ)
// =========================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    const t = themes[currentThemeKey];

    // --- ПЛАВНАЯ ИНТЕРПОЛЯЦИЯ ТЕМЫ (LERP) ---
    const lerpSpeed = 0.015; // Мягкая, кинематографичная смена за пару секунд

    // Цвета
    skyMat.uniforms.topColor.value.lerp(new THREE.Color(t.skyTop), lerpSpeed);
    skyMat.uniforms.bottomColor.value.lerp(new THREE.Color(t.skyBottom), lerpSpeed);
    (scene.fog as THREE.FogExp2).color.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    ambientLightObj.color.lerp(new THREE.Color(t.ambientLight), lerpSpeed);
    mainLightObj.color.lerp(new THREE.Color(t.mainLight), lerpSpeed);
    accentLightObj.color.lerp(new THREE.Color(t.accentLight), lerpSpeed);
    meshMaterial.color.lerp(new THREE.Color(t.meshColor), lerpSpeed);
    wireMaterial.color.lerp(new THREE.Color(t.wireframeColor), lerpSpeed);
    pointsMaterial.color.lerp(new THREE.Color(t.pointsColor), lerpSpeed);
    pMat.color.lerp(new THREE.Color(t.particlesColor), lerpSpeed);

    // Параметры
    bloomPass.strength += (t.bloomStrength - bloomPass.strength) * lerpSpeed;
    wireMaterial.opacity += (t.wireOpacity - wireMaterial.opacity) * lerpSpeed;
    pointsMaterial.opacity += (t.pointsOpacity - pointsMaterial.opacity) * lerpSpeed;
    meshMaterial.roughness += (t.meshRoughness - meshMaterial.roughness) * lerpSpeed;
    meshMaterial.metalness += (t.meshMetalness - meshMaterial.metalness) * lerpSpeed;


    // --- ПАРАЛЛАКС И ДРИФТ КАМЕРЫ ---
    mouse.lerp(targetMouse, 0.08);
    // Кинематографичный дрифт (очень медленное "дыхание" оператора)
    const driftX = Math.sin(time * 0.15) * 1.5;
    const driftY = Math.cos(time * 0.1) * 1.0;

    camera.position.x += (mouse.x * 5 + driftX - camera.position.x) * 0.03;
    camera.position.y += (mouse.y * 3 + 8 + driftY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    let mouse3DPoint: THREE.Vector3 | null = null;
    if (isMouseActive) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(invisiblePlane);
        if (intersects.length > 0) mouse3DPoint = intersects[0].point;
    }

    // --- АНИМАЦИЯ СЕТКИ ---
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const initZ = initialZ[i];

        let z = initZ + Math.sin(time * 0.8 + x * 0.08) * 1.5;
        z += Math.cos(time * 0.5 + y * 0.08) * 1.5;

        if (mouse3DPoint) {
            const localMouse = mouse3DPoint.clone();
            terrainGroup.worldToLocal(localMouse);
            
            const dx = x - localMouse.x;
            const dy = y - localMouse.y; 
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 35) { 
                const force = Math.pow((35 - dist) / 35, 2);
                const ripple = Math.sin(dist * 0.6 - time * 8) * 2.0;
                z -= force * (12 + ripple); 
            }
        }
        pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals(); 

    // --- АНИМАЦИЯ ЧАСТИЦ ---
    const pPositions = particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        if (mouse3DPoint) {
            const px = pPositions[i3];
            const py = pPositions[i3 + 1];
            const pz = pPositions[i3 + 2];
            
            const dx = px - mouse3DPoint.x;
            const dy = py - mouse3DPoint.y;
            const dz = pz - mouse3DPoint.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            if (dist < 20) { 
                pVel[i].x += (dx / dist) * 0.06;
                pVel[i].y += (dy / dist) * 0.06;
                pVel[i].z += (dz / dist) * 0.06;
            }
        }

        pVel[i].lerp(pBaseVel[i], 0.04);
        pPositions[i3] += pVel[i].x;
        pPositions[i3 + 1] += pVel[i].y;
        pPositions[i3 + 2] += pVel[i].z;

        if (pPositions[i3] < -120) pPositions[i3] = 120;
        if (pPositions[i3 + 1] > 60) pPositions[i3 + 1] = -10;
        if (pPositions[i3 + 2] > 70) pPositions[i3 + 2] = -70;
    }
    particleGeo.attributes.position.needsUpdate = true;

    terrainGroup.rotation.z = Math.sin(time * 0.03) * 0.01;

    composer.render();
}

animate();