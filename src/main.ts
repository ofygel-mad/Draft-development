import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import GUI from 'lil-gui';

// --- 1. СЦЕНА, КАМЕРА, РЕНДЕРЕР ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x00020a, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 30);
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
    1.2, 
    0.5, 
    0.1  
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 3. ОРГАНИЧЕСКАЯ СЕТКА И ЛИНИИ ---
const planeWidth = 120;
const planeHeight = 120;
const segments = 60;

const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, segments, segments);
planeGeometry.rotateX(-Math.PI / 2);

const pointsMaterial = new THREE.PointsMaterial({
    color: 0x0088ff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending 
});
const points = new THREE.Points(planeGeometry, pointsMaterial);
scene.add(points);

const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x0033aa,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending
});
const gridMesh = new THREE.Mesh(planeGeometry, wireframeMaterial);
scene.add(gridMesh);

// --- 4. КОМЕТЫ (СВЕТЯЩИЕСЯ КУБИКИ И ХВОСТЫ) ---
const cometsCount = 25; // Количество комет
const tailLength = 20;  // Длина хвоста в точках
const comets: { head: THREE.Mesh, tail: THREE.Line, trailCoords: THREE.Vector3[], velocity: THREE.Vector3 }[] = [];

// Геометрия кубика (головы)
const cometGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
// Яркий белый цвет, чтобы Bloom заставил его мощно светиться
const cometMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Создаем градиент затухания для хвоста
const tailColors = new Float32Array(tailLength * 3);
for (let i = 0; i < tailLength; i++) {
    const fade = 1 - (i / tailLength); // Плавно от 1 до 0
    // Синий цвет (RGB: 0.0, 0.5, 1.0), умноженный на затухание
    tailColors[i * 3] = 0.0 * fade;
    tailColors[i * 3 + 1] = 0.5 * fade;
    tailColors[i * 3 + 2] = 1.0 * fade;
}

const tailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true, // Включаем поддержку цветов вершин
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

for (let i = 0; i < cometsCount; i++) {
    const head = new THREE.Mesh(cometGeometry, cometMaterial);
    
    // Рандомная стартовая позиция
    const startX = (Math.random() - 0.5) * planeWidth;
    const startY = Math.random() * 8 + 2; 
    const startZ = (Math.random() - 0.5) * planeHeight;
    head.position.set(startX, startY, startZ);
    scene.add(head);

    // Инициализируем массив точек хвоста в стартовой позиции
    const trailCoords = [];
    for (let j = 0; j < tailLength; j++) {
        trailCoords.push(new THREE.Vector3(startX, startY, startZ));
    }

    const tailGeometry = new THREE.BufferGeometry().setFromPoints(trailCoords);
    tailGeometry.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
    const tail = new THREE.Line(tailGeometry, tailMaterial);
    scene.add(tail);

    // Рандомный вектор скорости для каждой кометы
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3, 
        (Math.random() - 0.5) * 0.1, 
        (Math.random() - 0.5) * 0.3  
    );

    comets.push({ head, tail, trailCoords, velocity });
}


// --- 5. ПАНЕЛЬ НАСТРОЕК (lil-gui) ---
const gui = new GUI();
const settings = {
    waveSpeed: 0.5,
    waveHeight: 2.5,
    waveFrequency: 0.12,
    cometSpeed: 1.0 // Множитель скорости комет
};

// ... (остальные папки GUI оставляем без изменений)
const bloomFolder = gui.addFolder('Свечение');
bloomFolder.add(bloomPass, 'strength', 0, 3).name('Сила');
bloomFolder.add(bloomPass, 'radius', 0, 1).name('Радиус');

const waveFolder = gui.addFolder('Волны');
waveFolder.add(settings, 'waveSpeed', 0, 2).name('Скорость');
waveFolder.add(settings, 'waveHeight', 0, 10).name('Высота амплитуды');
waveFolder.add(settings, 'waveFrequency', 0, 0.5).name('Частота (изгибы)');

const cometsFolder = gui.addFolder('Кометы');
cometsFolder.add(settings, 'cometSpeed', 0, 3).name('Скорость полета');


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

    const elapsedTime = clock.getElapsedTime() * settings.waveSpeed;
    const positions = planeGeometry.attributes.position;

    // 7.1. Анимация волн
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const y = Math.sin(x * settings.waveFrequency + elapsedTime) * settings.waveHeight +
                  Math.cos(z * settings.waveFrequency + elapsedTime * 0.8) * (settings.waveHeight * 0.8);
        positions.setY(i, y);
    }
    positions.needsUpdate = true;

    // 7.2. Анимация комет
    comets.forEach(comet => {
        // Двигаем кубик по вектору скорости
        comet.head.position.addScaledVector(comet.velocity, settings.cometSpeed);
        
        // Вращаем кубик для красоты
        comet.head.rotation.x += 0.05;
        comet.head.rotation.y += 0.05;

        // Если комета улетела за пределы сетки - респавним её
        if (comet.head.position.x > planeWidth / 2 || comet.head.position.x < -planeWidth / 2 ||
            comet.head.position.z > planeHeight / 2 || comet.head.position.z < -planeHeight / 2 ||
            comet.head.position.y > 15 || comet.head.position.y < -5) {
            
            comet.head.position.set(
                (Math.random() - 0.5) * planeWidth,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * planeHeight
            );
            
            // Сбрасываем хвост, чтобы он не тянулся через весь экран
            for (let j = 0; j < tailLength; j++) {
                comet.trailCoords[j].copy(comet.head.position);
            }
        } else {
            // Двигаем хвост: удаляем последнюю точку, добавляем текущую позицию кубика в начало
            comet.trailCoords.pop();
            comet.trailCoords.unshift(comet.head.position.clone());
        }

        // Обновляем линию хвоста
        comet.tail.geometry.setFromPoints(comet.trailCoords);
    });

    composer.render();
}

animate();