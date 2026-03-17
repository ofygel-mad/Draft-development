import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 1. СЦЕНА, КАМЕРА, РЕНДЕРЕР ---
const scene = new THREE.Scene();
// Глубокий темно-синий туман, как в оригинальном видео
scene.fog = new THREE.FogExp2(0x000614, 0.02);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 40);
camera.lookAt(0, 0, 0);

const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!document.body.contains(canvas)) document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x00020a);

// --- 2. ПОСТ-ОБРАБОТКА (BLOOM) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // Сила свечения
    0.4, // Радиус размытия
    0.1  // Порог
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 3. ИНТЕРАКТИВНОСТЬ (МЫШЬ И RAYCASTER) ---
const mouse = new THREE.Vector2(-1000, -1000); // Убираем за экран со старта
const targetMouse = new THREE.Vector2(-1000, -1000);
const raycaster = new THREE.Raycaster();
// Невидимая плоскость для точного отслеживания курсора в 3D
const invisiblePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ visible: false })
);
invisiblePlane.rotation.x = -Math.PI / 2;
scene.add(invisiblePlane);

window.addEventListener('mousemove', (event) => {
    targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Отключаем влияние мыши, если она покинула окно
window.addEventListener('mouseout', () => {
    targetMouse.set(-1000, -1000);
});

// --- 4. ОРГАНИЧЕСКАЯ СЕТКА И ЛИНИИ ---
const planeWidth = 140;
const planeHeight = 140;
const segments = 70;

const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, segments, segments);
planeGeometry.rotateX(-Math.PI / 2);

// Настройки волн
const settings = {
    waveSpeed: 0.3,
    waveHeight: 3.5,
    waveFrequency: 0.15,
    mouseRadius: 15, // Радиус влияния курсора
    mouseForce: 6    // Сила продавливания сетки
};

const pointsMaterial = new THREE.PointsMaterial({
    color: 0x00aaff,
    size: 0.2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
});
const points = new THREE.Points(planeGeometry, pointsMaterial);
scene.add(points);

const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x003388,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending
});
const gridMesh = new THREE.Mesh(planeGeometry, wireframeMaterial);
scene.add(gridMesh);

// --- 5. КОМЕТЫ (СВЕТЯЩИЕСЯ КУБИКИ И ХВОСТЫ) ---
const cometsCount = 35;
const tailLength = 25;
const comets: { head: THREE.Mesh, tail: THREE.Line, trailCoords: THREE.Vector3[], velocity: THREE.Vector3, baseSpeed: number }[] = [];

const cometGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const cometMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

const tailColors = new Float32Array(tailLength * 3);
for (let i = 0; i < tailLength; i++) {
    const fade = 1 - (i / tailLength);
    tailColors[i * 3] = 0.0 * fade;
    tailColors[i * 3 + 1] = 0.8 * fade;
    tailColors[i * 3 + 2] = 1.0 * fade;
}

const tailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
});

for (let i = 0; i < cometsCount; i++) {
    const head = new THREE.Mesh(cometGeometry, cometMaterial);

    const startX = (Math.random() - 0.5) * planeWidth;
    const startY = Math.random() * 10 + 2;
    const startZ = (Math.random() - 0.5) * planeHeight;
    head.position.set(startX, startY, startZ);
    scene.add(head);

    const trailCoords = [];
    for (let j = 0; j < tailLength; j++) {
        trailCoords.push(new THREE.Vector3(startX, startY, startZ));
    }

    const tailGeometry = new THREE.BufferGeometry().setFromPoints(trailCoords);
    tailGeometry.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
    const tail = new THREE.Line(tailGeometry, tailMaterial);
    scene.add(tail);

    const baseSpeed = Math.random() * 0.5 + 0.5;
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.4
    ).normalize().multiplyScalar(baseSpeed);

    comets.push({ head, tail, trailCoords, velocity, baseSpeed });
}

// --- 6. РЕСАЙЗ ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// --- 7. ЦИКЛ АНИМАЦИИ ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Плавное следование реальных координат за целевыми (Lerp)
    mouse.lerp(targetMouse, 0.1);

    // Вычисляем точку пересечения курсора с невидимой плоскостью
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(invisiblePlane);
    let mouse3DPoint: THREE.Vector3 | null = null;

    if (intersects.length > 0) {
        mouse3DPoint = intersects[0].point;
    }

    // 7.1. Анимация волн + Интерактивность
    const positions = planeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Базовая математика волн
        let y = Math.sin(x * settings.waveFrequency + elapsedTime * settings.waveSpeed) * settings.waveHeight +
                Math.cos(z * settings.waveFrequency + elapsedTime * (settings.waveSpeed * 0.8)) * (settings.waveHeight * 0.8);

        // Влияние мыши: создаем "вмятину" в сетке вокруг курсора
        if (mouse3DPoint) {
            const dx = x - mouse3DPoint.x;
            const dz = z - mouse3DPoint.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < settings.mouseRadius) {
                // Чем ближе к центру курсора, тем сильнее отталкивание вниз
                const influence = 1 - (distance / settings.mouseRadius);
                // Функция easeInOut для более гладкой вмятины
                const smoothInfluence = influence * influence * (3 - 2 * influence);
                y -= smoothInfluence * settings.mouseForce;
            }
        }

        positions.setY(i, y);
    }
    positions.needsUpdate = true;

    // 7.2. Анимация комет + Отталкивание от мыши
    comets.forEach(comet => {
        // Добавляем реакцию кометы на курсор
        if (mouse3DPoint) {
            const distToMouse = comet.head.position.distanceTo(mouse3DPoint);
            if (distToMouse < 20) {
                // Вычисляем вектор отторжения от мыши
                const repulsion = new THREE.Vector3().subVectors(comet.head.position, mouse3DPoint).normalize();
                // Плавно добавляем его к скорости кометы
                comet.velocity.add(repulsion.multiplyScalar(0.05));
            }
        }

        // Постепенно возвращаем комету к её базовой скорости после ускорения
        comet.velocity.lerp(comet.velocity.clone().normalize().multiplyScalar(comet.baseSpeed), 0.05);

        // Двигаем и вращаем
        comet.head.position.add(comet.velocity);
        comet.head.rotation.x += 0.05;
        comet.head.rotation.y += 0.05;

        // Респавн при вылете за границы
        if (comet.head.position.x > planeWidth / 2 || comet.head.position.x < -planeWidth / 2 ||
            comet.head.position.z > planeHeight / 2 || comet.head.position.z < -planeHeight / 2 ||
            comet.head.position.y > 20 || comet.head.position.y < -10) {

            comet.head.position.set(
                (Math.random() - 0.5) * planeWidth,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * planeHeight
            );

            for (let j = 0; j < tailLength; j++) {
                comet.trailCoords[j].copy(comet.head.position);
            }
        } else {
            comet.trailCoords.pop();
            comet.trailCoords.unshift(comet.head.position.clone());
        }

        comet.tail.geometry.setFromPoints(comet.trailCoords);
    });

    composer.render();
}

animate();
