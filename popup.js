// IMPORTANTE: Asegúrate de tener 'three.module.js' y 'OrbitControls.js' en la carpeta.
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';

// --- CLASE PARA NÚMEROS COMPLEJOS ---
class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }
    add(c) { return new Complex(this.re + c.re, this.im + c.im); }
    mult(c) { return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re); }
    magSq() { return this.re * this.re + this.im * this.im; }
    conj() { return new Complex(this.re, -this.im); }
}

// --- UTILIDAD: TEXTO EN 3D ---
function createTextLabel(text, colorStr = 'black', sizeScale = 0.6) {
    const canvas = document.createElement('canvas');
    const size = 128; 
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    context.fillStyle = colorStr;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 42px Arial'; 
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(sizeScale, sizeScale, 1); 
    return sprite;
}

// --- PARSEO DEL INPUT ---
function parseStateVector(inputStr) {
    let cleanStr = inputStr.replace(/[\[\]\s]/g, '');
    let parts = cleanStr.split(',').filter(p => p.length > 0);
    
    return parts.map(p => {
        let re = 0, im = 0;
        if (p.includes('j')) {
            let temp = p.replace('j', '');
            let signIndex = -1;
            for(let i=1; i<temp.length; i++) {
                if(temp[i] === '+' || temp[i] === '-') signIndex = i;
            }

            if (signIndex === -1) {
                if(temp === '' || temp === '+') im = 1;
                else if(temp === '-') im = -1;
                else im = parseFloat(temp);
            } else {
                let reStr = temp.substring(0, signIndex);
                let imStr = temp.substring(signIndex);
                re = parseFloat(reStr);
                if (imStr === '+' || imStr === '') im = 1;
                else if (imStr === '-') im = -1;
                else im = parseFloat(imStr);
            }
        } else {
            re = parseFloat(p);
        }
        
        if (isNaN(re)) re = 0;
        if (isNaN(im)) im = 0;

        return new Complex(re, im);
    });
}

// --- LÓGICA CUÁNTICA GENERALIZADA (TRAZA PARCIAL) ---
function getBlochVector(state, qubitIndex, totalQubits) {
    // Inicializamos la matriz de densidad reducida para el qubit k
    let rho00 = 0;
    let rho11 = 0;
    let rho01 = new Complex(0, 0);

    // CAMBIO IMPORTANTE: INVERSIÓN DE ORDEN (LITTLE ENDIAN)
    // En Qiskit/Composer, el Qubit 0 es el LSB (derecha).
    // Antes: totalQubits - 1 - qubitIndex (Big Endian/Leftmost)
    // Ahora: qubitIndex (Little Endian/Rightmost)
    const bitPos = qubitIndex; 
    const mask = 1 << bitPos;

    // Iteramos sobre todos los estados de la base computacional
    for (let i = 0; i < state.length; i++) {
        if ((i & mask) === 0) {
            const i0 = i;
            const i1 = i | mask;

            const c0 = state[i0];
            const c1 = state[i1];

            rho00 += c0.magSq();
            rho11 += c1.magSq();
            rho01 = rho01.add(c0.mult(c1.conj()));
        }
    }

    // Convertir Matriz de Densidad a Vector de Bloch (x, y, z)
    // Rx = 2 * Re(rho01)
    // Ry = 2 * Im(rho01)
    // Rz = rho00 - rho11
    
    let rx = 2 * rho01.re;
    let ry = 2 * rho01.im; 
    let rz = rho00 - rho11;

    // Mapeo de coordenadas Física -> Three.js
    // Three Y = Bloch Z (Arriba)
    // Three X = Bloch Y (Derecha - Eje Amarillo/Verde)
    // Three Z = Bloch X (Frente - Eje Rojo)
    return new THREE.Vector3(ry, rz, rx); 
}

// --- VISUALIZACIÓN THREE.JS ---
const scenes = [];

function createBlochSphere(containerId, vector, qubitIdx) {
    const container = document.getElementById(containerId);
    if (!container) return; 
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4, 2, 5); 
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio); 
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // A. Esfera base
    const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
    const sphereMat = new THREE.MeshPhongMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.15,
        side: THREE.DoubleSide,
        shininess: 60
    });
    const mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(mainSphere);

    // Iluminación
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x505050));

    // B. Anillos
    const ringMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.7 });
    const circlePoints = new THREE.Shape().absarc(0, 0, 1.005, 0, Math.PI * 2).getPoints(128);
    const ringGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    
    const equator = new THREE.Line(ringGeo, ringMat); equator.rotation.x = Math.PI / 2; scene.add(equator);
    const meridian1 = new THREE.Line(ringGeo, ringMat); meridian1.rotation.y = Math.PI / 2; scene.add(meridian1);
    const meridian2 = new THREE.Line(ringGeo, ringMat); scene.add(meridian2);

    // C. Ejes y Etiquetas Principales (X, Y, Z)
    
    // Eje Y Three.js -> Bloch Z (Azul)
    // Longitud aumentada a 2.4 (sobresale)
    const axisY = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4), new THREE.MeshBasicMaterial({color: 0x3b82f6}));
    scene.add(axisY);
    // Etiquetas separadas a 1.4 y 1.8
    const lbl0 = createTextLabel("|0⟩", "#1d4ed8"); lbl0.position.set(0, 1.4, 0); scene.add(lbl0);
    const lbl1 = createTextLabel("|1⟩", "#1d4ed8"); lbl1.position.set(0, -1.4, 0); scene.add(lbl1);
    const lblZ = createTextLabel("Z", "#1d4ed8", 0.8); lblZ.position.set(0, 1.8, 0); scene.add(lblZ); // Etiqueta Eje

    // Eje Z Three.js -> Bloch X (Rojo, viene hacia el frente)
    const axisZ = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4), new THREE.MeshBasicMaterial({color: 0xef4444}));
    axisZ.rotation.x = Math.PI / 2;
    scene.add(axisZ);
    // Etiquetas separadas a 1.4 y 1.8
    const lblPlus = createTextLabel("|+⟩", "#b91c1c"); lblPlus.position.set(0, 0, 1.4); scene.add(lblPlus);
    const lblMinus = createTextLabel("|-⟩", "#b91c1c"); lblMinus.position.set(0, 0, -1.4); scene.add(lblMinus);
    const lblX = createTextLabel("X", "#b91c1c", 0.8); lblX.position.set(0, 0, 1.8); scene.add(lblX); // Etiqueta Eje

    // Eje X Three.js -> Bloch Y (Amarillo/Verde, horizontal)
    const axisX = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4), new THREE.MeshBasicMaterial({color: 0xeab308}));
    axisX.rotation.z = Math.PI / 2;
    scene.add(axisX);
    // Etiquetas separadas a 1.4 y 1.8
    const lblI = createTextLabel("|i⟩", "#a16207"); lblI.position.set(1.4, 0, 0); scene.add(lblI);
    const lblNi = createTextLabel("|-i⟩", "#a16207"); lblNi.position.set(-1.4, 0, 0); scene.add(lblNi);
    const lblY = createTextLabel("Y", "#a16207", 0.8); lblY.position.set(1.8, 0, 0); scene.add(lblY); // Etiqueta Eje

    // D. Vector
    const len = vector.length();
    
    if (len > 0.05) {
        const arrowColor = 0x7c3aed;
        const direction = vector.clone().normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        const arrowGroup = new THREE.Group();
        arrowGroup.quaternion.copy(quaternion);

        const visualLen = len; 
        const shaftLen = visualLen * 0.8;
        const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, shaftLen, 32);
        const shaftMat = new THREE.MeshPhongMaterial({ color: arrowColor });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.y = shaftLen / 2; 
        arrowGroup.add(shaft);

        const headLen = 0.25;
        const headGeo = new THREE.ConeGeometry(0.1, headLen, 32);
        const headMat = new THREE.MeshPhongMaterial({ color: arrowColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = shaftLen + (headLen / 2);
        arrowGroup.add(head);

        scene.add(arrowGroup);
    } else {
        const centerGeo = new THREE.SphereGeometry(0.2, 32, 32);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.8 });
        const centerDot = new THREE.Mesh(centerGeo, centerMat);
        scene.add(centerDot);

        const mixedLabel = createTextLabel("Incertidumbre Total", "#c026d3");
        mixedLabel.position.set(0, 0.5, 0);
        mixedLabel.scale.set(0.5, 0.5, 1);
        scene.add(mixedLabel);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    scenes.push({ renderer, container });
}

// --- FUNCIÓN DE DETECCIÓN EN PÁGINA ---
function findQuantumStateInPage() {
    const regex = /\[\s*((?:[\-0-9\.]+(?:[\+\-][0-9\.]*j)?\s*,\s*)+[\-0-9\.]+(?:[\+\-][0-9\.]*j)?)\s*\]/g;
    const bodyText = document.body.innerText;
    const matches = bodyText.match(regex);
    if (matches && matches.length > 0) {
        return matches[0];
    }
    return null;
}

// --- MAIN APP ---
function runVisualizer() {
    const input = document.getElementById('stateInput').value;
    const errorDiv = document.getElementById('errorMsg');
    const canvasContainer = document.getElementById('canvases');
    
    errorDiv.classList.remove('visible');
    canvasContainer.innerHTML = '';
    
    scenes.forEach(s => {
        s.container.innerHTML = '';
        s.renderer.dispose();
    });
    scenes.length = 0;

    try {
        const state = parseStateVector(input);
        const N = state.length;
        
        // Verificaciones de seguridad y potencia de 2
        if ((N & (N - 1)) !== 0 || N === 0) {
            throw new Error("La longitud debe ser potencia de 2 (2, 4, 8, 16...).");
        }
        
        // Aumentado el límite a 5 Qubits (2^5 = 32 amplitudes)
        if (N > 32) {
            throw new Error("Soportamos máximo 5 Qubits (vector de 32 elementos) por rendimiento.");
        }

        const numQubits = Math.log2(N);
        
        for(let i=0; i < numQubits; i++) {
            // Usamos la nueva función generalizada
            const blochVec = getBlochVector(state, i, numQubits);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'canvas-container';
            wrapper.id = `qubit-${i}`;
            
            const label = document.createElement('div');
            label.className = 'qubit-label';
            label.innerText = `Qubit ${i}`;
            
            const purity = blochVec.length();
            if (purity < 0.99 && purity > 0.1) {
                label.innerText += " (Mixto)";
                label.style.color = "#d97706";
            } else if (purity <= 0.1) {
                label.innerText += " (Entrelazado)";
                label.style.color = "#db2777";
            }

            wrapper.appendChild(label);
            canvasContainer.appendChild(wrapper);

            createBlochSphere(`qubit-${i}`, blochVec, i);
        }

    } catch (e) {
        errorDiv.innerText = "Error: " + e.message;
        errorDiv.classList.add('visible');
    }
}

let lastDetectedVector = "";

function monitorPage() {
    if (chrome.tabs && chrome.scripting) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0] || !tabs[0].id || tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('edge://')) return;

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: findQuantumStateInPage
            }, (results) => {
                if (chrome.runtime.lastError) {
                    return;
                }

                if (results && results[0] && results[0].result) {
                    const foundVector = results[0].result;
                    if (foundVector !== lastDetectedVector) {
                        lastDetectedVector = foundVector;
                        const stateInput = document.getElementById('stateInput');
                        const detectIcon = document.getElementById('detectIcon');
                        
                        stateInput.value = foundVector;
                        detectIcon.style.display = "block";
                        runVisualizer();
                    }
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const visualizeBtn = document.getElementById('visualizeBtn');
    const stateInput = document.getElementById('stateInput');

    visualizeBtn.addEventListener('click', runVisualizer);
    
    // --- EJEMPLOS (Se mantienen para pruebas rápidas de 1 y 2 qubits) ---
    document.getElementById('btnEj1').addEventListener('click', () => {
        stateInput.value = "[0.7071+0j, 0.7071+0j]";
        runVisualizer();
    });

    document.getElementById('btnEj2').addEventListener('click', () => {
        stateInput.value = "[0.7071+0j, 0+0j, 0+0j, 0.7071+0j]";
        runVisualizer();
    });

    document.getElementById('btnEj3').addEventListener('click', () => {
        stateInput.value = "[0.8944+0j, 0+0j, 0+0j, 0.4472+0j]";
        runVisualizer();
    });

    runVisualizer();
    monitorPage(); 
    setInterval(monitorPage, 1000); 
});