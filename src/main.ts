import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// =========================================================
// 1. СИСТЕМА ТЕМ: НЕЗАВИСИМЫЙ WORKSPACE (EMISSIVE + ENTERPRISE)
// =========================================================

type ThemeConfig = {
    skyTop: number; skyBottom: number; horizonColor: number;
    fogColor: number; fogDensity: number; exposure: number;
    ambientLight: number; mainLight: number; accentLight: number;
    meshColor: number; 
    emissiveColor: number;     
    emissiveIntensity: number; 
    wireframeColor: number; pointsColor: number; particlesColor: number;
    bloomStrength: number; wireOpacity: number; pointsOpacity: number;
    meshRoughness: number; meshMetalness: number;
};

const themes: Record<string, ThemeConfig> = {
    default: {
        // НОВОЕ: Офисный ровный свет, серо-синяя твердая матовая поверхность (без черноты)
        skyTop: 0x0b1220, skyBottom: 0x1d2938, horizonColor: 0x3a4659,
        fogColor: 0x1b2431, fogDensity: 0.0018, exposure: 0.96,
        ambientLight: 0x687485, mainLight: 0xd4dbe5, accentLight: 0x6a7688,
        meshColor: 0x3a4551,
        emissiveColor: 0x0f151d,
        emissiveIntensity: 0.04,
        wireframeColor: 0x7c8998, pointsColor: 0x9aa6b2, particlesColor: 0x6e7b8b,
        bloomStrength: 0.015, wireOpacity: 0.04, pointsOpacity: 0.015,
        meshRoughness: 0.96, meshMetalness: 0.02
    },
    morning: {
        skyTop: 0x24304a, skyBottom: 0x5b677d, horizonColor: 0xe0b893,
        fogColor: 0x434d60, fogDensity: 0.0032, exposure: 0.9,
        ambientLight: 0x7a7f89, mainLight: 0xf0c79f, accentLight: 0x8b95a6,
        // ENTERPRISE: Светлее на несколько тонов, холодный стальной
        meshColor: 0x4b4d52,
        emissiveColor: 0x14171d,    
        emissiveIntensity: 0.045,    
        wireframeColor: 0xd2c3b5, pointsColor: 0xe8dccd, particlesColor: 0xb2b9c2,
        bloomStrength: 0.025, wireOpacity: 0.05, pointsOpacity: 0.02,
        meshRoughness: 0.95, meshMetalness: 0.02 
    },
    overcast: {
        // ПРЕДВЕЧЕРНЕЕ ВРЕМЯ (GOLDEN HOUR): Мягкий персиковый горизонт, нет белого света
        skyTop: 0x121922, skyBottom: 0x4c5966, horizonColor: 0xaebcc5,
        fogColor: 0x485661, fogDensity: 0.0068, exposure: 0.7,
        ambientLight: 0x768391,
        mainLight: 0xdfc29e, // Теплый, приглушенный золотистый луч (не прожектор!)
        accentLight: 0x536372,
        // ENTERPRISE: Очень светлая, холодная рабочая поверхность
        meshColor: 0x3d4854,
        emissiveColor: 0x0d1218,
        emissiveIntensity: 0.034,
        wireframeColor: 0x94a5b2, pointsColor: 0xc0ced7, particlesColor: 0x90a0aa,
        bloomStrength: 0.012, wireOpacity: 0.036, pointsOpacity: 0.014,
        meshRoughness: 0.99, meshMetalness: 0.01
    },
    dusk: {
        skyTop: 0x321f33, skyBottom: 0x8a5d52, horizonColor: 0xf1b47a,
        fogColor: 0x5e3f43, fogDensity: 0.003, exposure: 0.92,
        ambientLight: 0x7a6058, mainLight: 0xe6ad7b, accentLight: 0xa58b93,
        // ENTERPRISE: Сохраняем светлый тон даже в закате
        meshColor: 0x4c3f3b,
        emissiveColor: 0x171211,    
        emissiveIntensity: 0.055,
        wireframeColor: 0xe4c3aa, pointsColor: 0xf5dac1, particlesColor: 0xc6a89d,
        bloomStrength: 0.03, wireOpacity: 0.055, pointsOpacity: 0.024,
        meshRoughness: 0.94, meshMetalness: 0.02
    },
    night: {
        skyTop: 0x04070d, skyBottom: 0x0f1a29, horizonColor: 0x22334a,
        fogColor: 0x09111b, fogDensity: 0.0026, exposure: 0.9,
        ambientLight: 0x46576e, mainLight: 0x9ab7da, accentLight: 0x5d76a0,
        // ENTERPRISE: Значительно высветлен. Глубокий, но светящийся синий корпоративный цвет
        meshColor: 0x1f2c3d,        
        emissiveColor: 0x0b1017,    
        emissiveIntensity: 0.04,
        wireframeColor: 0x6c8bb4,   
        pointsColor: 0x9ebde0, particlesColor: 0x728cad,
        bloomStrength: 0.02, wireOpacity: 0.05, pointsOpacity: 0.02, 
        meshRoughness: 0.97, meshMetalness: 0.03
    }
};

themes.overcast.mainLight = 0x9aabb7;

function getThemeByTime(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 17) return 'overcast';
    if (hour >= 17 && hour < 21) return 'dusk';
    return 'night';
}

let currentThemeKey = 'default';
let followTimeTheme = false;
let lastResolvedTimeTheme = getThemeByTime();
let refreshThemeButtons: (() => void) | null = null;
let refreshFlightUi: (() => void) | null = null;
let flightModeEnabled = false;
let flightSpeed = 66;
let flightYaw = 0;
let flightPitch = -0.22;
const activeMovementKeys = new Set<string>();

type TerrainInfluence = {
    point: THREE.Vector3;
    radius: number;
    deformStrength: number;
    fogStrength: number;
};

type LandingState = {
    active: boolean;
    targetY: number;
    velocity: number;
    dropStrength: number;
};

// =========================================================
// 2. ИНИЦИАЛИЗАЦИЯ
// =========================================================

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(themes[currentThemeKey].fogColor, themes[currentThemeKey].fogDensity);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 7, 45); 
const terrainRadius = 128;
const terrainFlightRadius = terrainRadius * 0.92;
const terrainFogInnerRadius = terrainRadius * 0.88;
const terrainFogOuterRadius = terrainRadius * 1.18;
const minOrbitLocalHeight = 3.6;
const minFlightLocalHeight = 7.2;
const maxFlightLocalHeight = 62;
const orbitTarget = new THREE.Vector3(0, -1.4, 0);
const orbitOffset = camera.position.clone().sub(orbitTarget);
const orbitSpherical = new THREE.Spherical().setFromVector3(orbitOffset);
const targetOrbitSpherical = new THREE.Spherical().copy(orbitSpherical);
const orbitCameraOffset = new THREE.Vector3();
const minPolarAngle = 0.18;
const maxPolarAngle = Math.PI / 2 + 0.28;
const dragRotationSpeed = 0.0055;
const maxFlightPitch = Math.PI / 2 - 0.12;
const worldUp = new THREE.Vector3(0, 1, 0);
const lookTarget = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const moveIntent = new THREE.Vector3();
const terrainLocalPosition = new THREE.Vector3();
const terrainWorldPosition = new THREE.Vector3();
const neonEdgeBaseColor = new THREE.Color(0x7ed0ff);
const neonEdgeThemeColor = new THREE.Color();
const neonEdgeTargetColor = new THREE.Color();
const fogInteractionPoints = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const fogInteractionWeights = [0, 0, 0];
const terrainCameraLocalPoint = new THREE.Vector3();
const rainCenter = new THREE.Vector3();
const groundProbeOrigin = new THREE.Vector3();
const groundProbeNormalMatrix = new THREE.Matrix3();
const impactWavePoint = new THREE.Vector3();
const impactWaveLocalPoint = new THREE.Vector3();
const orbitSupportPoint = new THREE.Vector3();
const orbitSupportNormal = new THREE.Vector3();
const landingLookDirection = new THREE.Vector3();
const landingLookTarget = new THREE.Vector3();
const landingState: LandingState = { active: false, targetY: 0, velocity: 0, dropStrength: 0 };
let impactWaveActive = false;
let impactWaveStartedAt = -100;
let impactWaveStrength = 0;
let nextLightningAt = 30;
let lightningProgress = 0;

const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!document.body.contains(canvas)) document.body.appendChild(canvas);
canvas.style.cursor = 'grab';
canvas.style.touchAction = 'none';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = themes[currentThemeKey].exposure;

function createSoftDotTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvasEl = document.createElement('canvas');
    canvasEl.width = size;
    canvasEl.height = size;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) {
        const fallback = new THREE.CanvasTexture(canvasEl);
        fallback.needsUpdate = true;
        return fallback;
    }

    const gradient = ctx.createRadialGradient(
        size * 0.5,
        size * 0.5,
        0,
        size * 0.5,
        size * 0.5,
        size * 0.5
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvasEl);
    texture.needsUpdate = true;
    return texture;
}

const softDotTexture = createSoftDotTexture();

// --- ШЕЙДЕР НЕБА ---
const skyGeo = new THREE.SphereGeometry(600, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    uniforms: {
        topColor: { value: new THREE.Color(themes[currentThemeKey].skyTop) },
        bottomColor: { value: new THREE.Color(themes[currentThemeKey].skyBottom) },
        horizonColor: { value: new THREE.Color(themes[currentThemeKey].horizonColor) },
        time: { value: 0 }
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
        uniform vec3 horizonColor;
        uniform float time;
        varying vec3 vWorldPosition;

        void main() {
            float h = normalize(vWorldPosition).y;
            float horizonBand = smoothstep(-0.08, 0.16, h);
            float upperBand = smoothstep(0.08, 0.82, h);
            float glow = pow(1.0 - clamp(abs(h * 1.1), 0.0, 1.0), 3.0);

            vec3 midColor = mix(bottomColor, topColor, 0.38);
            vec3 color = mix(horizonColor, bottomColor, horizonBand);
            color = mix(color, midColor, upperBand * 0.7);
            color = mix(color, topColor, smoothstep(0.45, 0.96, h));
            color += horizonColor * glow * 0.035;

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);

// =========================================================
// 3. ОСВЕЩЕНИЕ (ВЫСВЕТЛЕНИЕ ТЕНЕЙ)
// =========================================================

const ambientLightObj = new THREE.AmbientLight(themes[currentThemeKey].ambientLight, 0.72);
const ambientLightBaseIntensity = 0.72;
scene.add(ambientLightObj);

// ENTERPRISE ФИКС: Усилен холодный заполняющий свет снизу. 
// Теперь тени не черные, а холодные стальные, что делает сцену светлее и легче.
const hemiLight = new THREE.HemisphereLight(0xc1d4f0, 0x2a364f, 0.38);
const hemiLightBaseIntensity = 0.38;
scene.add(hemiLight);

const mainLightObj = new THREE.DirectionalLight(themes[currentThemeKey].mainLight, 0.78); 
const mainLightBaseIntensity = 0.78;
mainLightObj.position.set(-18, 34, 12); 
scene.add(mainLightObj);

const accentLightObj = new THREE.DirectionalLight(themes[currentThemeKey].accentLight, 0.2);
const accentLightBaseIntensity = 0.2;
accentLightObj.position.set(22, 16, -10);
scene.add(accentLightObj);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    themes[currentThemeKey].bloomStrength, 
    0.25,  
    0.5  
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

function terrainMotion(x: number, y: number, time: number): number {
    return (
        Math.sin(time * 0.78 + x * 0.073) * 1.82 +
        Math.cos(time * 0.46 + y * 0.074) * 1.74 +
        Math.sin(time * 1.34 + x * 0.168) * 0.16 +
        Math.cos(time * 0.62 + (x - y) * 0.048) * 0.24
    );
}

function createCircularTerrainGeometry(radius: number, widthSegments: number, heightSegments: number): THREE.BufferGeometry {
    const sourceX: number[] = [];
    const sourceY: number[] = [];
    const nextPositions: number[] = [];
    const nextUvs: number[] = [];
    const indices: number[] = [];
    const vertexMap = new Map<number, number>();
    const size = radius * 2;
    const gridWidth = widthSegments + 1;

    for (let iy = 0; iy <= heightSegments; iy++) {
        const y = (iy / heightSegments - 0.5) * size;

        for (let ix = 0; ix <= widthSegments; ix++) {
            const x = (ix / widthSegments - 0.5) * size;
            sourceX.push(x);
            sourceY.push(y);
        }
    }

    const ensureVertex = (sourceIndex: number) => {
        const existing = vertexMap.get(sourceIndex);
        if (existing !== undefined) {
            return existing;
        }

        const x = sourceX[sourceIndex];
        const y = sourceY[sourceIndex];
        const nextIndex = nextPositions.length / 3;
        nextPositions.push(x, y, 0);
        nextUvs.push(x / size + 0.5, y / size + 0.5);
        vertexMap.set(sourceIndex, nextIndex);
        return nextIndex;
    };

    const appendTriangle = (a: number, b: number, c: number) => {
        const centroidX = (sourceX[a] + sourceX[b] + sourceX[c]) / 3;
        const centroidY = (sourceY[a] + sourceY[b] + sourceY[c]) / 3;

        if (Math.hypot(centroidX, centroidY) > radius * 0.995) {
            return;
        }

        indices.push(ensureVertex(a), ensureVertex(b), ensureVertex(c));
    };

    for (let iy = 0; iy < heightSegments; iy++) {
        for (let ix = 0; ix < widthSegments; ix++) {
            const a = iy * gridWidth + ix;
            const b = a + 1;
            const c = a + gridWidth;
            const d = c + 1;

            appendTriangle(a, c, b);
            appendTriangle(b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(nextPositions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(nextUvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

function getNeonEdgeStrength(themeName: string): number {
    switch (themeName) {
        case 'night':
            return 1;
        case 'default':
            return 0.82;
        case 'dusk':
            return 0.42;
        case 'morning':
            return 0.26;
        case 'overcast':
            return 0.2;
        default:
            return 0.3;
    }
}

const hazeGeo = new THREE.PlaneGeometry(420, 78, 1, 1);
const hazeMat = new THREE.ShaderMaterial({
    uniforms: {
        baseColor: { value: new THREE.Color(themes[currentThemeKey].fogColor) },
        glowColor: { value: new THREE.Color(themes[currentThemeKey].horizonColor) },
        opacity: { value: 0.24 },
        time: { value: 0 },
        storminess: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        uniform float opacity;
        uniform float time;
        uniform float storminess;
        varying vec2 vUv;

        void main() {
            float driftA = sin(vUv.x * 9.0 + time * 0.08) * 0.5 + 0.5;
            float driftB = cos(vUv.x * 15.0 - time * 0.06) * 0.5 + 0.5;
            float vertical = smoothstep(0.02, 0.92, vUv.y);
            float horizontal = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5));
            float cloud = mix(driftA, driftB, 0.46);
            float alpha = vertical * horizontal * opacity * mix(0.78, 1.55, storminess) * (0.72 + cloud * 0.42);
            vec3 color = mix(baseColor, glowColor, vUv.y * (0.4 + storminess * 0.22) + cloud * 0.08);
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    fog: false
});
const hazeBand = new THREE.Mesh(hazeGeo, hazeMat);
hazeBand.position.set(0, 3.4, -115);
scene.add(hazeBand);

const mistGeo = new THREE.PlaneGeometry(560, 96, 1, 1);
const mistMat = new THREE.ShaderMaterial({
    uniforms: {
        baseColor: { value: new THREE.Color(themes[currentThemeKey].fogColor) },
        highlightColor: { value: new THREE.Color(themes[currentThemeKey].horizonColor) },
        opacity: { value: 0.06 },
        time: { value: 0 },
        storminess: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 highlightColor;
        uniform float opacity;
        uniform float time;
        uniform float storminess;
        varying vec2 vUv;

        void main() {
            float layerA = sin(vUv.x * 8.0 + time * 0.07) * 0.5 + 0.5;
            float layerB = cos(vUv.x * 12.5 - time * 0.05) * 0.5 + 0.5;
            float layerC = sin((vUv.x + vUv.y) * 10.0 + time * 0.03) * 0.5 + 0.5;
            float body = smoothstep(0.0, 0.86, vUv.y);
            float cloud = (layerA * 0.38 + layerB * 0.34 + layerC * 0.28) * body;
            float lane = 1.0 - smoothstep(0.36, 1.0, abs(vUv.x - 0.5));
            float alpha = cloud * opacity * lane * mix(0.85, 1.85, storminess);
            vec3 color = mix(baseColor, highlightColor, vUv.y * 0.26 + layerA * 0.06 + storminess * 0.08);
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    fog: false
});
const mistBand = new THREE.Mesh(mistGeo, mistMat);
mistBand.position.set(0, 8.8, -150);
scene.add(mistBand);

// =========================================================
// 4. ГЕОМЕТРИЯ
// =========================================================

const geometry = createCircularTerrainGeometry(terrainRadius, 132, 132);
const positions = geometry.attributes.position as THREE.BufferAttribute;
const baseX = new Float32Array(positions.count);
const baseY = new Float32Array(positions.count);
const initialZ = new Float32Array(positions.count);

for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const radialDistance = Math.hypot(x, y);
    const edgeBlend = THREE.MathUtils.smoothstep(radialDistance, terrainRadius * 0.7, terrainRadius);
    const z = (Math.random() - 0.5) * (3.8 - edgeBlend * 2.2) - edgeBlend * 9.5;

    baseX[i] = x;
    baseY[i] = y;
    initialZ[i] = z;
    positions.setZ(i, z);
}
geometry.computeVertexNormals();

const meshMaterial = new THREE.MeshStandardMaterial({
    color: themes[currentThemeKey].meshColor,
    emissive: themes[currentThemeKey].emissiveColor,
    emissiveIntensity: themes[currentThemeKey].emissiveIntensity,
    roughness: themes[currentThemeKey].meshRoughness,
    metalness: themes[currentThemeKey].meshMetalness,
    flatShading: true,
    side: THREE.DoubleSide
});
const surface = new THREE.Mesh(geometry, meshMaterial);

const wireMaterial = new THREE.MeshBasicMaterial({
    color: themes[currentThemeKey].wireframeColor,
    wireframe: true,
    transparent: true,
    opacity: themes[currentThemeKey].wireOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const wireframe = new THREE.Mesh(geometry, wireMaterial);

const glowWireMaterial = new THREE.MeshBasicMaterial({
    color: 0x7ed0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const glowWireframe = new THREE.Mesh(geometry, glowWireMaterial);

const pointsMaterial = new THREE.PointsMaterial({
    color: themes[currentThemeKey].pointsColor,
    size: 0.09,
    transparent: true,
    opacity: themes[currentThemeKey].pointsOpacity,
    alphaMap: softDotTexture,
    alphaTest: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const surfacePoints = new THREE.Points(geometry, pointsMaterial);

const terrainGroup = new THREE.Group();
terrainGroup.add(surface);
terrainGroup.add(wireframe);
terrainGroup.add(glowWireframe);
terrainGroup.add(surfacePoints);
terrainGroup.rotation.x = -Math.PI / 2.12;
terrainGroup.position.y = -10;

const boundaryFogGeo = new THREE.RingGeometry(terrainFogInnerRadius, terrainFogOuterRadius, 160, 1);
const boundaryFogMat = new THREE.ShaderMaterial({
    uniforms: {
        baseColor: { value: new THREE.Color(themes[currentThemeKey].fogColor) },
        glowColor: { value: new THREE.Color(themes[currentThemeKey].horizonColor) },
        opacity: { value: 0.32 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        uniform float opacity;
        varying vec2 vUv;

        void main() {
            float dist = distance(vUv, vec2(0.5));
            float innerFade = smoothstep(0.26, 0.41, dist);
            float outerFade = 1.0 - smoothstep(0.43, 0.5, dist);
            float alpha = innerFade * outerFade * opacity;
            vec3 color = mix(baseColor, glowColor, smoothstep(0.33, 0.49, dist) * 0.65);
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide
});
const boundaryFog = new THREE.Mesh(boundaryFogGeo, boundaryFogMat);
boundaryFog.position.z = 5.8;
boundaryFog.visible = false;
terrainGroup.add(boundaryFog);

const terrainFogGeo = new THREE.CircleGeometry(terrainRadius * 1.02, 160);
const terrainFogMat = new THREE.ShaderMaterial({
    uniforms: {
        baseColor: { value: new THREE.Color(themes[currentThemeKey].fogColor) },
        highlightColor: { value: new THREE.Color(themes[currentThemeKey].horizonColor) },
        opacity: { value: 0.12 },
        time: { value: 0 },
        storminess: { value: 0 },
        interactionPoints: { value: fogInteractionPoints },
        interactionWeights: { value: fogInteractionWeights }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vLocalPosition;
        void main() {
            vUv = uv;
            vLocalPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 highlightColor;
        uniform float opacity;
        uniform float time;
        uniform float storminess;
        uniform vec3 interactionPoints[3];
        uniform float interactionWeights[3];
        varying vec2 vUv;
        varying vec3 vLocalPosition;

        float fogNoise(vec2 p) {
            float layerA = sin(p.x * 0.031 + time * 0.17) * 0.5 + 0.5;
            float layerB = cos(p.y * 0.027 - time * 0.12) * 0.5 + 0.5;
            float layerC = sin((p.x + p.y) * 0.016 + time * 0.08) * 0.5 + 0.5;
            float layerD = cos(length(p) * 0.019 - time * 0.05) * 0.5 + 0.5;
            return (layerA * 0.28 + layerB * 0.24 + layerC * 0.24 + layerD * 0.24);
        }

        void main() {
            float radial = distance(vUv, vec2(0.5));
            float edgeFade = 1.0 - smoothstep(0.34, 0.82, radial);
            vec2 drifted = vLocalPosition.xy + vec2(time * 3.4, -time * 2.1);
            float bodyNoise = fogNoise(drifted);
            float detailNoise = fogNoise(drifted.yx * 1.22 + 26.0);
            float lowNoise = fogNoise(drifted * 0.58 - 40.0);
            float fogBody = mix(bodyNoise, detailNoise, 0.42) * 0.72 + lowNoise * 0.28;
            float horizonLift = smoothstep(0.24, 0.78, radial);
            float depthBoost = mix(0.9, 1.85, storminess);
            float alpha = fogBody * edgeFade * opacity * depthBoost * (0.64 + horizonLift * 0.92);

            float clearance = 0.0;
            for (int i = 0; i < 3; i++) {
                float dist = distance(vLocalPosition.xy, interactionPoints[i].xy);
                float spread = 1.0 - smoothstep(10.0, mix(44.0, 54.0, storminess), dist);
                clearance = max(clearance, spread * interactionWeights[i]);
            }

            alpha *= 1.0 - clearance * 0.92;
            if (alpha < 0.01) discard;

            vec3 color = mix(baseColor, highlightColor, horizonLift * 0.24 + fogBody * (0.08 + storminess * 0.06));
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
});
const terrainFogLayer = new THREE.Mesh(terrainFogGeo, terrainFogMat);
terrainFogLayer.position.z = 8.6;
terrainGroup.add(terrainFogLayer);
scene.add(terrainGroup);

const particleCount = 42; 
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
    size: 0.16, 
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    alphaMap: softDotTexture,
    alphaTest: 0.06,
    depthWrite: false
});
const particles = new THREE.Points(particleGeo, pMat);
scene.add(particles);

const rainCount = 900;
const rainGeo = new THREE.BufferGeometry();
const rainDrops = new Float32Array(rainCount * 3);
const rainLinePositions = new Float32Array(rainCount * 2 * 3);
const rainVelocity = new Float32Array(rainCount);
const rainDrift = new Float32Array(rainCount);
const rainLength = new Float32Array(rainCount);
const rainPhase = new Float32Array(rainCount);
const rainSwing = new Float32Array(rainCount);
const rainDepth = new Float32Array(rainCount);

for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    rainDrops[i3] = (Math.random() - 0.5) * 220;
    rainDrops[i3 + 1] = Math.random() * 120 + 10;
    rainDrops[i3 + 2] = (Math.random() - 0.5) * 220;
    rainVelocity[i] = 18 + Math.random() * 14;
    rainDrift[i] = 1.6 + Math.random() * 2.2;
    rainLength[i] = 0.32 + Math.random() * 0.9;
    rainPhase[i] = Math.random() * Math.PI * 2;
    rainSwing[i] = 0.12 + Math.random() * 0.38;
    rainDepth[i] = 0.5 + Math.random() * 0.95;
}

rainGeo.setAttribute('position', new THREE.BufferAttribute(rainLinePositions, 3));

const rainMat = new THREE.LineBasicMaterial({
    color: 0xc7d8e4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending
});
const rain = new THREE.LineSegments(rainGeo, rainMat);
scene.add(rain);

const lightningOverlay = document.createElement('div');
lightningOverlay.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 30;
    opacity: 0; mix-blend-mode: screen;
    background:
        radial-gradient(circle at 50% 24%, rgba(232,243,255,0.9) 0%, rgba(232,243,255,0.35) 22%, rgba(232,243,255,0.08) 48%, rgba(232,243,255,0) 74%),
        linear-gradient(180deg, rgba(228,240,255,0.55) 0%, rgba(228,240,255,0.18) 38%, rgba(228,240,255,0) 100%);
    transition: opacity 40ms linear;
`;
document.body.appendChild(lightningOverlay);

// =========================================================
// 5. ИНТЕРАКТИВ И СМЕНА ТЕМ
// =========================================================

function applyTheme(themeName: string) {
    if (!themes[themeName]) return;

    if (themeName === 'default') {
        followTimeTheme = false;
        currentThemeKey = 'default';
        return;
    }

    followTimeTheme = true;
    currentThemeKey = themeName;
    lastResolvedTimeTheme = getThemeByTime();
}

function syncFlightLookFromCamera() {
    camera.getWorldDirection(cameraForward);
    flightYaw = Math.atan2(cameraForward.x, cameraForward.z);
    flightPitch = THREE.MathUtils.clamp(
        Math.asin(THREE.MathUtils.clamp(cameraForward.y, -0.99, 0.99)),
        -maxFlightPitch,
        maxFlightPitch
    );
}

function syncOrbitFromCamera() {
    orbitOffset.copy(camera.position).sub(orbitTarget);

    if (orbitOffset.lengthSq() < 0.001) {
        orbitOffset.set(0, 7, 45).sub(orbitTarget);
    }

    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.radius = THREE.MathUtils.clamp(orbitSpherical.radius, 28, 92);
    orbitSpherical.phi = THREE.MathUtils.clamp(orbitSpherical.phi, minPolarAngle, maxPolarAngle);
    targetOrbitSpherical.copy(orbitSpherical);
}

function getTerrainPointBelow(worldPosition: THREE.Vector3, outPoint: THREE.Vector3, outNormal: THREE.Vector3): boolean {
    groundProbeOrigin.copy(worldPosition);
    groundProbeOrigin.y += 240;
    raycaster.set(groundProbeOrigin, new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(surface, false);

    if (hits.length === 0) {
        return false;
    }

    outPoint.copy(hits[0].point);

    if (hits[0].face) {
        groundProbeNormalMatrix.getNormalMatrix(surface.matrixWorld);
        outNormal.copy(hits[0].face.normal).applyMatrix3(groundProbeNormalMatrix).normalize();
    } else {
        outNormal.copy(worldUp);
    }

    return true;
}

function startImpactWave(worldPoint: THREE.Vector3, strength: number, time: number) {
    impactWavePoint.copy(worldPoint);
    terrainGroup.worldToLocal(impactWaveLocalPoint.copy(worldPoint));
    impactWaveStrength = strength;
    impactWaveStartedAt = time;
    impactWaveActive = true;
}

function finalizeOrbitFromDirection(direction: THREE.Vector3) {
    cameraForward.copy(direction).normalize();
    raycaster.set(camera.position, cameraForward);

    const terrainHits = raycaster.intersectObject(surface, false);
    if (terrainHits.length > 0) {
        orbitTarget.copy(terrainHits[0].point);
    } else {
        const planeHits = raycaster.intersectObject(invisiblePlane, false);
        if (planeHits.length > 0) {
            orbitTarget.copy(planeHits[0].point);
        } else {
            orbitTarget.copy(camera.position).add(cameraForward.multiplyScalar(42));
        }
    }

    syncOrbitFromCamera();
}

function beginOrbitFromCurrentLocation() {
    landingState.active = false;
    landingState.velocity = 0;
    landingState.dropStrength = 0;
    camera.getWorldDirection(landingLookDirection).normalize();

    if (!getTerrainPointBelow(camera.position, orbitSupportPoint, orbitSupportNormal)) {
        finalizeOrbitFromDirection(landingLookDirection);
        return;
    }

    const landingHeight = orbitSupportPoint.y + 4.2;
    const dropDistance = camera.position.y - landingHeight;

    if (dropDistance > 0.1) {
        landingState.active = true;
        landingState.targetY = landingHeight;
        landingState.velocity = 0;
        landingState.dropStrength = THREE.MathUtils.clamp(dropDistance / 18, 0.25, 1.9);
    } else {
        camera.position.y = Math.max(camera.position.y, landingHeight);
        finalizeOrbitFromDirection(landingLookDirection);
    }
}

function setFlightMode(enabled: boolean) {
    if (flightModeEnabled === enabled) {
        return;
    }

    flightModeEnabled = enabled;

    if (flightModeEnabled) {
        landingState.active = false;
        constrainFlightPosition(camera.position);
        syncFlightLookFromCamera();
    } else {
        activeMovementKeys.clear();
        beginOrbitFromCurrentLocation();
    }

    refreshFlightUi?.();
}

const createUI = () => {
    const uiContainer = document.createElement('div');
    uiContainer.dataset.interactiveUi = 'true';
    uiContainer.style.cssText = `
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000;
        display: flex; gap: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: rgba(15, 20, 30, 0.65); padding: 6px; border-radius: 999px;
        backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    `;
    const buttons: HTMLButtonElement[] = [];
    const getButtonLabel = (key: string) => (key === 'overcast' ? 'Overcast' : key);
    const updateActiveButton = () => {
        buttons.forEach((button) => {
            const isActive = button.dataset.theme === currentThemeKey;
            button.style.cssText = `${baseStyle}${isActive ? activeStyle : ''}`;
        });
    };

    const baseStyle = `
        padding: 8px 20px; background: transparent; border: none; color: rgba(255,255,255,0.7);
        border-radius: 999px; cursor: pointer; transition: all 0.2s ease;
        font-size: 13px; font-weight: 500; text-transform: capitalize; letter-spacing: 0.3px; min-width: 110px; text-align: center;
    `;
    const activeStyle = `background: rgba(255,255,255,0.12); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.1);`;

    Object.keys(themes).forEach(key => {
        const btn = document.createElement('button');
        btn.dataset.theme = key;
        btn.innerText = getButtonLabel(key);
        btn.style.cssText = baseStyle + (key === currentThemeKey ? activeStyle : '');

        btn.onclick = () => {
            applyTheme(key);
            updateActiveButton();
        };

        buttons.push(btn);
        uiContainer.appendChild(btn);
    });

    updateActiveButton();
    refreshThemeButtons = updateActiveButton;
    document.body.appendChild(uiContainer);
};
createUI();

const createFlightUI = () => {
    const panel = document.createElement('div');
    panel.dataset.interactiveUi = 'true';
    panel.style.cssText = `
        position: fixed; left: 24px; bottom: 24px; z-index: 1000;
        display: grid; gap: 10px; min-width: 240px;
        background: rgba(12, 17, 26, 0.72); padding: 14px 16px; border-radius: 18px;
        backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.22); color: rgba(255,255,255,0.9);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const toggleButton = document.createElement('button');
    toggleButton.style.cssText = `
        padding: 10px 14px; border: none; border-radius: 12px; cursor: pointer;
        font-size: 13px; font-weight: 600; letter-spacing: 0.2px;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
    `;

    const hint = document.createElement('div');
    hint.style.cssText = `font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.62);`;
    hint.textContent = 'W A S D: движение, Space / Shift: вверх и вниз, мышь: обзор.';

    const speedLabel = document.createElement('label');
    speedLabel.style.cssText = `
        display: none; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.78);
    `;

    const speedHeader = document.createElement('div');
    speedHeader.style.cssText = `display: flex; justify-content: space-between; gap: 12px; align-items: center;`;

    const speedTitle = document.createElement('span');
    speedTitle.textContent = 'Скорость полёта';

    const speedValue = document.createElement('span');
    speedValue.style.cssText = `font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.92);`;

    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '66';
    speedInput.max = '66';
    speedInput.step = '0';
    speedInput.value = '66';
    speedInput.style.cssText = `width: 100%; accent-color: #d9e7ff;`;
    speedInput.oninput = () => {
        flightSpeed = 66;
        refreshFlightUi?.();
    };

    speedHeader.appendChild(speedTitle);
    speedHeader.appendChild(speedValue);
    speedLabel.appendChild(speedHeader);
    speedLabel.appendChild(speedInput);

    toggleButton.onclick = () => {
        setFlightMode(!flightModeEnabled);
    };

    panel.appendChild(toggleButton);
    panel.appendChild(speedLabel);
    panel.appendChild(hint);
    document.body.appendChild(panel);

    refreshFlightUi = () => {
        toggleButton.textContent = flightModeEnabled ? 'Режим полёта: Вкл' : 'Режим полёта: Выкл';
        toggleButton.style.background = flightModeEnabled ? 'rgba(196, 226, 255, 0.16)' : 'rgba(255,255,255,0.08)';
        toggleButton.style.color = flightModeEnabled ? '#eef6ff' : 'rgba(255,255,255,0.86)';
        toggleButton.style.transform = flightModeEnabled ? 'translateY(-1px)' : 'translateY(0)';
        speedValue.textContent = '66';
        speedInput.value = '66';
    };

    refreshFlightUi();
};
createFlightUI();

const mouse = new THREE.Vector2(0, 0); 
const targetMouse = new THREE.Vector2(0, 0); 
let isMouseActive = false; 
let isDraggingScene = false;
let activePointerId: number | null = null;
let lastPointerX = 0;
let lastPointerY = 0;

const raycaster = new THREE.Raycaster();
const invisiblePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(terrainRadius * 3.2, terrainRadius * 3.2),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
);
invisiblePlane.rotation.x = -Math.PI / 2.12;
invisiblePlane.position.y = -10;
scene.add(invisiblePlane);

function constrainFlightPosition(worldPosition: THREE.Vector3) {
    terrainLocalPosition.copy(worldPosition);
    terrainGroup.worldToLocal(terrainLocalPosition);

    const radialDistance = Math.hypot(terrainLocalPosition.x, terrainLocalPosition.y);
    if (radialDistance > terrainFlightRadius) {
        const clampScale = terrainFlightRadius / radialDistance;
        terrainLocalPosition.x *= clampScale;
        terrainLocalPosition.y *= clampScale;
    }

    terrainLocalPosition.z = THREE.MathUtils.clamp(terrainLocalPosition.z, minFlightLocalHeight, maxFlightLocalHeight);
    terrainWorldPosition.copy(terrainLocalPosition);
    terrainGroup.localToWorld(terrainWorldPosition);
    worldPosition.copy(terrainWorldPosition);
}

function clampCameraAboveTerrainPlane(worldPosition: THREE.Vector3, minLocalHeight: number) {
    terrainLocalPosition.copy(worldPosition);
    terrainGroup.worldToLocal(terrainLocalPosition);

    if (terrainLocalPosition.z < minLocalHeight) {
        terrainLocalPosition.z = minLocalHeight;
        terrainWorldPosition.copy(terrainLocalPosition);
        terrainGroup.localToWorld(terrainWorldPosition);
        worldPosition.copy(terrainWorldPosition);
    }
}

function clampCameraAboveSurface(worldPosition: THREE.Vector3, clearance: number) {
    if (!getTerrainPointBelow(worldPosition, orbitSupportPoint, orbitSupportNormal)) {
        return;
    }

    const minY = orbitSupportPoint.y + clearance;
    if (worldPosition.y < minY) {
        worldPosition.y = minY;
    }
}

function updatePointerPosition(event: PointerEvent) {
    isMouseActive = true; 
    targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function isUiInteractionTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('[data-interactive-ui="true"]');
}

function stopSceneDrag(pointerId?: number) {
    if (pointerId !== undefined && activePointerId !== null && pointerId !== activePointerId) {
        return;
    }

    isDraggingScene = false;
    activePointerId = null;
    canvas.style.cursor = 'grab';
}

window.addEventListener('pointerdown', (event) => {
    updatePointerPosition(event);

    if (event.button !== 0 || isUiInteractionTarget(event.target)) {
        return;
    }

    isDraggingScene = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.style.cursor = 'grabbing';
    event.preventDefault();
});

window.addEventListener('pointermove', (event) => {
    updatePointerPosition(event);

    if (!isDraggingScene || event.pointerId !== activePointerId) {
        return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    if (flightModeEnabled) {
        flightYaw -= deltaX * dragRotationSpeed;
        flightPitch = THREE.MathUtils.clamp(
            flightPitch - deltaY * dragRotationSpeed * 0.72,
            -maxFlightPitch,
            maxFlightPitch
        );
        return;
    }

    targetOrbitSpherical.theta -= deltaX * dragRotationSpeed;
    targetOrbitSpherical.phi = THREE.MathUtils.clamp(
        targetOrbitSpherical.phi - deltaY * dragRotationSpeed * 0.72,
        minPolarAngle,
        maxPolarAngle
    );
});

window.addEventListener('pointerup', (event) => {
    stopSceneDrag(event.pointerId);
});

window.addEventListener('pointercancel', (event) => {
    stopSceneDrag(event.pointerId);
});

window.addEventListener('pointerleave', () => {
    isMouseActive = false; 
    targetMouse.set(0, 0); 
    stopSceneDrag();
});

window.addEventListener('blur', () => {
    isMouseActive = false;
    targetMouse.set(0, 0);
    activeMovementKeys.clear();
    stopSceneDrag();
});

window.addEventListener('keydown', (event) => {
    const movementCodes = [
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'
    ];

    if (!movementCodes.includes(event.code)) {
        return;
    }

    activeMovementKeys.add(event.code);
    event.preventDefault();
});

window.addEventListener('keyup', (event) => {
    activeMovementKeys.delete(event.code);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================
// 6. ЦИКЛ АНИМАЦИИ
// =========================================================
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (followTimeTheme) {
        const nextTimeTheme = getThemeByTime();
        if (nextTimeTheme !== lastResolvedTimeTheme) {
            currentThemeKey = nextTimeTheme;
            lastResolvedTimeTheme = nextTimeTheme;
            refreshThemeButtons?.();
        }
    }

    const t = themes[currentThemeKey];
    const denseFogTheme = currentThemeKey === 'overcast';
    const overcastIntensity = denseFogTheme ? 1 : 0;
    frameCount++;

    const lerpSpeed = 0.015;

    if (denseFogTheme && lightningProgress <= 0 && time >= nextLightningAt) {
        lightningProgress = 0.55;
        nextLightningAt = time + 26 + Math.random() * 8;
    }

    if (lightningProgress > 0) {
        lightningProgress = Math.max(0, lightningProgress - deltaTime);
    }

    const lightningAge = 0.55 - lightningProgress;
    const lightningFlash = denseFogTheme && lightningProgress > 0
        ? Math.max(
            Math.exp(-lightningAge * 14) * 1.9,
            Math.exp(-Math.pow(lightningAge - 0.08, 2) / 0.0014) * 1.35,
            Math.exp(-Math.pow(lightningAge - 0.2, 2) / 0.0032) * 0.95
        )
        : 0;

    skyMat.uniforms.time.value = time;
    skyMat.uniforms.topColor.value.lerp(new THREE.Color(t.skyTop), lerpSpeed);
    skyMat.uniforms.bottomColor.value.lerp(new THREE.Color(t.skyBottom), lerpSpeed);
    skyMat.uniforms.horizonColor.value.lerp(new THREE.Color(t.horizonColor), lerpSpeed);
    
    (scene.fog as THREE.FogExp2).color.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    ambientLightObj.color.lerp(new THREE.Color(t.ambientLight), lerpSpeed);
    mainLightObj.color.lerp(new THREE.Color(t.mainLight), lerpSpeed);
    accentLightObj.color.lerp(new THREE.Color(t.accentLight), lerpSpeed);
    ambientLightObj.intensity = ambientLightBaseIntensity + lightningFlash * 1.2;
    hemiLight.intensity = hemiLightBaseIntensity + lightningFlash * 0.5;
    mainLightObj.intensity = mainLightBaseIntensity + lightningFlash * 2.9;
    accentLightObj.intensity = accentLightBaseIntensity + lightningFlash * 0.95;
    meshMaterial.color.lerp(new THREE.Color(t.meshColor), lerpSpeed);
    
    meshMaterial.emissive.lerp(new THREE.Color(t.emissiveColor), lerpSpeed);
    meshMaterial.emissiveIntensity +=
        (Math.min(t.emissiveIntensity, 0.035) - meshMaterial.emissiveIntensity) * lerpSpeed;

    wireMaterial.color.lerp(new THREE.Color(t.wireframeColor), lerpSpeed);
    neonEdgeThemeColor.set(t.horizonColor);
    neonEdgeTargetColor.copy(neonEdgeBaseColor).lerp(neonEdgeThemeColor, 0.28);
    glowWireMaterial.color.lerp(neonEdgeTargetColor, lerpSpeed * 1.35);
    pointsMaterial.color.lerp(new THREE.Color(t.pointsColor), lerpSpeed);
    pMat.color.lerp(new THREE.Color(t.particlesColor), lerpSpeed);
    rainMat.color.lerp(new THREE.Color(t.horizonColor), lerpSpeed * 0.7);
    hazeMat.uniforms.baseColor.value.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    hazeMat.uniforms.glowColor.value.lerp(new THREE.Color(t.horizonColor), lerpSpeed);
    hazeMat.uniforms.time.value = time;
    hazeMat.uniforms.storminess.value += (overcastIntensity - hazeMat.uniforms.storminess.value) * (lerpSpeed * 1.5);
    terrainFogMat.uniforms.baseColor.value.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    terrainFogMat.uniforms.highlightColor.value.lerp(new THREE.Color(t.horizonColor), lerpSpeed);
    boundaryFogMat.uniforms.baseColor.value.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    boundaryFogMat.uniforms.glowColor.value.lerp(new THREE.Color(t.horizonColor), lerpSpeed);
    const mistyTheme = denseFogTheme || currentThemeKey === 'morning' || currentThemeKey === 'night';
    hazeMat.uniforms.opacity.value += ((denseFogTheme ? 0.21 : mistyTheme ? 0.12 : 0.03) - hazeMat.uniforms.opacity.value) * lerpSpeed;
    mistMat.uniforms.baseColor.value.lerp(new THREE.Color(t.fogColor), lerpSpeed);
    mistMat.uniforms.highlightColor.value.lerp(new THREE.Color(t.horizonColor), lerpSpeed);
    mistMat.uniforms.opacity.value += ((denseFogTheme ? 0.22 : mistyTheme ? 0.14 : 0.0) - mistMat.uniforms.opacity.value) * lerpSpeed;
    mistMat.uniforms.time.value = time;
    mistMat.uniforms.storminess.value += (overcastIntensity - mistMat.uniforms.storminess.value) * (lerpSpeed * 1.5);
    terrainFogMat.uniforms.time.value = time;
    terrainFogMat.uniforms.storminess.value += (overcastIntensity - terrainFogMat.uniforms.storminess.value) * (lerpSpeed * 1.5);
    terrainFogMat.uniforms.opacity.value += ((denseFogTheme ? 0.28 : mistyTheme ? 0.17 : 0.1) - terrainFogMat.uniforms.opacity.value) * lerpSpeed;
    boundaryFogMat.uniforms.opacity.value += ((denseFogTheme ? 0.5 : mistyTheme ? 0.38 : 0.28) - boundaryFogMat.uniforms.opacity.value) * lerpSpeed;

    bloomPass.strength += (t.bloomStrength - bloomPass.strength) * lerpSpeed;
    wireMaterial.opacity += (Math.min(t.wireOpacity, 0.055) - wireMaterial.opacity) * lerpSpeed;
    const neonPulse = 0.62 + Math.sin(time * 1.9) * 0.23 + Math.cos(time * 0.75 + 0.8) * 0.11;
    const neonThemeStrength = getNeonEdgeStrength(currentThemeKey);
    const neonOpacityTarget = THREE.MathUtils.clamp((0.018 + neonPulse * 0.07) * neonThemeStrength, 0.008, 0.11);
    glowWireMaterial.opacity += (neonOpacityTarget - glowWireMaterial.opacity) * (lerpSpeed * 1.8);
    pointsMaterial.opacity += (Math.min(t.pointsOpacity, 0.028) - pointsMaterial.opacity) * lerpSpeed;
    rainMat.opacity += (((denseFogTheme ? 0.18 : 0) - rainMat.opacity) * (lerpSpeed * 1.85));
    
    meshMaterial.roughness += (t.meshRoughness - meshMaterial.roughness) * lerpSpeed;
    meshMaterial.metalness += (t.meshMetalness - meshMaterial.metalness) * lerpSpeed;
    
    const currentFog = scene.fog as THREE.FogExp2;
    currentFog.density += (t.fogDensity - currentFog.density) * lerpSpeed;
    renderer.toneMappingExposure += ((t.exposure + lightningFlash * 0.44) - renderer.toneMappingExposure) * lerpSpeed;
    lightningOverlay.style.opacity = denseFogTheme ? String(Math.min(0.82, lightningFlash * 0.44)) : '0';

    hazeBand.visible = !denseFogTheme && hazeMat.uniforms.opacity.value > 0.004;
    mistBand.visible = !denseFogTheme && mistMat.uniforms.opacity.value > 0.004;
    terrainFogLayer.visible = terrainFogMat.uniforms.opacity.value > 0.01;

    mouse.lerp(targetMouse, flightModeEnabled ? 0.11 : 0.06);

    if (flightModeEnabled) {
        cameraForward.set(
            Math.sin(flightYaw) * Math.cos(flightPitch),
            Math.sin(flightPitch),
            Math.cos(flightYaw) * Math.cos(flightPitch)
        ).normalize();
        cameraRight.crossVectors(worldUp, cameraForward).normalize();
        moveIntent.set(0, 0, 0);

        if (activeMovementKeys.has('KeyW')) moveIntent.add(cameraForward);
        if (activeMovementKeys.has('KeyS')) moveIntent.sub(cameraForward);
        if (activeMovementKeys.has('KeyD')) moveIntent.sub(cameraRight);
        if (activeMovementKeys.has('KeyA')) moveIntent.add(cameraRight);
        if (activeMovementKeys.has('Space')) moveIntent.add(worldUp);
        if (
            activeMovementKeys.has('ShiftLeft') ||
            activeMovementKeys.has('ShiftRight') ||
            activeMovementKeys.has('ControlLeft') ||
            activeMovementKeys.has('ControlRight')
        ) {
            moveIntent.sub(worldUp);
        }

        if (moveIntent.lengthSq() > 0) {
            moveIntent.normalize().multiplyScalar(flightSpeed * deltaTime);
            terrainWorldPosition.copy(camera.position).add(moveIntent);
            constrainFlightPosition(terrainWorldPosition);
            camera.position.copy(terrainWorldPosition);
        }

        camera.lookAt(lookTarget.copy(camera.position).add(cameraForward));
    } else {
        if (landingState.active) {
            const dropDistance = Math.max(0, camera.position.y - landingState.targetY);
            landingState.velocity += (18 + landingState.dropStrength * 56 + dropDistance * 0.55) * deltaTime;
            camera.position.y -= landingState.velocity * deltaTime;

            if (camera.position.y <= landingState.targetY) {
                camera.position.y = landingState.targetY;
                landingState.active = false;
                startImpactWave(orbitSupportPoint, landingState.dropStrength, time);
                finalizeOrbitFromDirection(landingLookDirection);
            } else {
                camera.lookAt(landingLookTarget.copy(camera.position).add(landingLookDirection));
            }
        }

        if (!landingState.active) {
            orbitSpherical.theta = THREE.MathUtils.lerp(orbitSpherical.theta, targetOrbitSpherical.theta, 0.14);
            orbitSpherical.phi = THREE.MathUtils.lerp(orbitSpherical.phi, targetOrbitSpherical.phi, 0.14);
            camera.position.copy(orbitTarget).add(orbitCameraOffset.setFromSpherical(orbitSpherical));
            clampCameraAboveTerrainPlane(camera.position, minOrbitLocalHeight);
            camera.lookAt(orbitTarget);
        }
    }

    let mouse3DPoint: THREE.Vector3 | null = null;
    if (isMouseActive) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(invisiblePlane);
        if (intersects.length > 0) mouse3DPoint = intersects[0].point;
    }

    let localTerrainMouse: THREE.Vector3 | null = null;
    if (mouse3DPoint) {
        localTerrainMouse = mouse3DPoint.clone();
        terrainGroup.worldToLocal(localTerrainMouse);
    }

    const activeInfluences: TerrainInfluence[] = [];
    if (localTerrainMouse) {
        activeInfluences.push({
            point: localTerrainMouse,
            radius: 38,
            deformStrength: 1,
            fogStrength: 1
        });
    }

    terrainCameraLocalPoint.copy(camera.position);
    terrainGroup.worldToLocal(terrainCameraLocalPoint);
    if (Math.hypot(terrainCameraLocalPoint.x, terrainCameraLocalPoint.y) < terrainRadius * 1.06) {
        activeInfluences.push({
            point: terrainCameraLocalPoint,
            radius: flightModeEnabled ? 34 : 24,
            deformStrength: 0,
            fogStrength: flightModeEnabled ? 0.95 : 0.35
        });
    }

    const impactWaveAge = time - impactWaveStartedAt;
    if (impactWaveActive) {
        if (impactWaveAge > 2.8) {
            impactWaveActive = false;
        } else {
            activeInfluences.push({
                point: impactWaveLocalPoint,
                radius: 52 + impactWaveAge * 18,
                deformStrength: 0,
                fogStrength: Math.max(0, 1 - impactWaveAge / 2.8)
            });
        }
    }

    for (let i = 0; i < fogInteractionPoints.length; i++) {
        const influence = activeInfluences[i];
        if (influence) {
            fogInteractionPoints[i].copy(influence.point);
            fogInteractionWeights[i] += (influence.fogStrength - fogInteractionWeights[i]) * 0.16;
        } else {
            fogInteractionPoints[i].set(9999, 9999, 0);
            fogInteractionWeights[i] += (0 - fogInteractionWeights[i]) * 0.16;
        }
    }

    for (let i = 0; i < positions.count; i++) {
        const x = baseX[i];
        const y = baseY[i];
        const radialDistance = Math.hypot(x, y);
        const edgeBlend = THREE.MathUtils.smoothstep(radialDistance, terrainRadius * 0.72, terrainRadius);
        let z = initialZ[i] + terrainMotion(x, y, time) * (1 - edgeBlend * 0.58) - edgeBlend * 8.2;

        for (const influence of activeInfluences) {
            if (influence.deformStrength <= 0) {
                continue;
            }

            const dx = x - influence.point.x;
            const dy = y - influence.point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < influence.radius) {
                const force = Math.pow((influence.radius - dist) / influence.radius, 2.05);
                const ripple = Math.sin(dist * 0.64 - time * 8.8) * 1.35;
                z -= force * (9.4 + ripple) * (1 - edgeBlend * 0.72) * influence.deformStrength;
            }
        }

        if (impactWaveActive) {
            const dx = x - impactWaveLocalPoint.x;
            const dy = y - impactWaveLocalPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const waveFront = impactWaveAge * 21;
            const waveWidth = 10 + impactWaveStrength * 4;
            const waveEnvelope = Math.exp(-Math.pow((dist - waveFront) / waveWidth, 2));
            const waveDecay = Math.max(0, 1 - impactWaveAge / 2.8);
            const ring = Math.sin((dist - waveFront) * 0.34) * waveEnvelope * 4.2 * impactWaveStrength * waveDecay;
            const crater = -Math.max(0, 1 - dist / (14 + impactWaveStrength * 10))
                * Math.max(0, 1 - impactWaveAge / 0.32)
                * 3.4
                * impactWaveStrength;
            z += (ring + crater) * (1 - edgeBlend * 0.7);
        }

        positions.setZ(i, z);
    }
    positions.needsUpdate = true;
    
    if (frameCount % 2 === 0) {
        geometry.computeVertexNormals(); 
    }

    if (!flightModeEnabled) {
        clampCameraAboveSurface(camera.position, 3.1);
        if (!landingState.active) {
            syncOrbitFromCamera();
        }
    }

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

    rainCenter.copy(camera.position);
    const rainArray = rainGeo.attributes.position.array as Float32Array;
    const rainGust = denseFogTheme ? (Math.sin(time * 0.62) * 1.5 + Math.cos(time * 0.31) * 0.9) : 0;
    const rainCrosswind = denseFogTheme ? (Math.cos(time * 0.44) * 0.8) : 0;
    for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        const lineIndex = i * 6;
        const flutter = Math.sin(time * (1.3 + rainSwing[i]) + rainPhase[i]) * rainSwing[i];
        const drizzlePulse = 0.82 + Math.sin(time * 0.55 + rainPhase[i] * 0.7) * 0.12;
        const lateralDrift = (-rainDrift[i] * 0.07) + rainGust * rainDepth[i] * 0.06 + flutter * 0.05;
        const forwardDrift = (rainDrift[i] * 0.34) + rainCrosswind * rainDepth[i] * 0.08;
        const fallSpeed = rainVelocity[i] * drizzlePulse;
        const segmentLength = rainLength[i] * (0.75 + rainDepth[i] * 0.35);

        rainDrops[i3] += lateralDrift * deltaTime;
        rainDrops[i3 + 1] -= fallSpeed * deltaTime;
        rainDrops[i3 + 2] += forwardDrift * deltaTime;

        const outOfRange =
            rainDrops[i3 + 1] < rainCenter.y - 18 ||
            Math.abs(rainDrops[i3] - rainCenter.x) > 112 ||
            Math.abs(rainDrops[i3 + 2] - rainCenter.z) > 112;

        if (outOfRange) {
            rainDrops[i3] = rainCenter.x + (Math.random() - 0.5) * 170;
            rainDrops[i3 + 1] = rainCenter.y + 32 + Math.random() * 64;
            rainDrops[i3 + 2] = rainCenter.z + (Math.random() - 0.5) * 170;
        }

        rainArray[lineIndex] = rainDrops[i3];
        rainArray[lineIndex + 1] = rainDrops[i3 + 1];
        rainArray[lineIndex + 2] = rainDrops[i3 + 2];
        rainArray[lineIndex + 3] = rainDrops[i3] + lateralDrift * 0.08;
        rainArray[lineIndex + 4] = rainDrops[i3 + 1] + segmentLength;
        rainArray[lineIndex + 5] = rainDrops[i3 + 2] - forwardDrift * 0.06;
    }
    rainGeo.attributes.position.needsUpdate = true;

    terrainGroup.rotation.z = Math.sin(time * 0.03) * 0.008;
    boundaryFog.rotation.z = time * 0.012;
    boundaryFog.position.z = 5.8 + Math.sin(time * 0.18) * 0.35;
    terrainFogLayer.position.z += (((denseFogTheme ? 11.8 : 8.6) + Math.sin(time * 0.22) * (denseFogTheme ? 0.65 : 0.22)) - terrainFogLayer.position.z) * 0.08;
    hazeBand.position.x += (mouse.x * 1.6 - hazeBand.position.x) * 0.018;
    hazeBand.position.y += (((denseFogTheme ? 4.2 : 3.4) + mouse.y * 0.35) - hazeBand.position.y) * 0.02;
    mistBand.position.x += (mouse.x * 1.2 - mistBand.position.x) * 0.014;
    mistBand.position.y += (((denseFogTheme ? 9.8 : mistyTheme ? 8.8 : 7.9) + mouse.y * 0.24) - mistBand.position.y) * 0.018;

    composer.render();
}

animate();
