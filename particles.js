import * as THREE from 'three';

/* =========================================================
   Partículas del hero
   Miles de puntos que, cada pocos segundos, se dispersan y se
   vuelven a reunir formando los logos de «Herramientas
   utilizadas». Cada partícula toma el color real del logo.
   Arranca como una esfera y, al terminar el loader, empieza
   el ciclo de logos.
   ========================================================= */
const host = document.querySelector('#particles');
const hero = document.querySelector('[data-hero]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const small = matchMedia('(max-width: 760px)').matches;

const LOGOS = [
    { src: 'img/icons/html5.svg', name: 'HTML' },
    { src: 'img/icons/css3.svg', name: 'CSS' },
    { src: 'img/icons/javascript.svg', name: 'JavaScript' },
    { src: 'img/icons/react.svg', name: 'React' },
    { src: 'img/icons/git.svg', name: 'Git' },
    { src: 'img/icons/github.svg', name: 'GitHub', light: true },
    { src: 'img/icons/bootstrap.svg', name: 'Bootstrap', solid: true },
    { src: 'img/icons/vscode.svg', name: 'VS Code' },
    { src: 'img/icons/threejs.svg', name: 'Three.js', light: true }
];

const COUNT = small ? 6500 : 13000;
const SIZE = 3.3; // ancho del logo en unidades de la escena
const DEPTH = 0.45; // grosor: da volumen al girar
const SAMPLE = 200; // resolución del muestreo de cada logo
const HOLD = 3.4; // segundos que se mantiene cada logo
const MORPH = 2.2; // segundos de transición

/* ---------- Muestreo de un logo SVG a posiciones y colores ---------- */
async function sampleLogo({ src, light, solid }) {
    // Se fija el tamaño del SVG para que se rasterice igual en todos los navegadores.
    const text = await (await fetch(src)).text();
    const svg = text.replace('<svg ', `<svg width="${SAMPLE}" height="${SAMPLE}" `);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;

    const pts = [];
    const cols = [];
    for (let y = 0; y < SAMPLE; y++) {
        for (let x = 0; x < SAMPLE; x++) {
            const k = (y * SAMPLE + x) * 4;
            if (data[k + 3] < 140) continue;
            let r = data[k] / 255;
            let g = data[k + 1] / 255;
            let b = data[k + 2] / 255;
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (light) {
                // Logos negros (GitHub, Three.js): se pintan claros sobre el fondo oscuro.
                r = 0.86 + Math.random() * 0.1;
                g = 0.86 + Math.random() * 0.1;
                b = 0.92 + Math.random() * 0.08;
            } else if (!solid && lum < 0.22) {
                // Las zonas oscuras (p. ej. las letras de JS) quedan como hueco;
                // los logos "solid" (Bootstrap, violeta oscuro) se conservan completos.
                continue;
            }
            pts.push(x, y);
            cols.push(r, g, b);
        }
    }

    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const n = pts.length / 2;
    for (let i = 0; i < COUNT; i++) {
        const j = Math.floor(Math.random() * n);
        positions[i * 3] = ((pts[j * 2] + Math.random()) / SAMPLE - 0.5) * SIZE;
        positions[i * 3 + 1] = -((pts[j * 2 + 1] + Math.random()) / SAMPLE - 0.5) * SIZE;
        positions[i * 3 + 2] = (Math.random() - 0.5) * DEPTH;
        colors[i * 3] = cols[j * 3];
        colors[i * 3 + 1] = cols[j * 3 + 1];
        colors[i * 3 + 2] = cols[j * 3 + 2];
    }
    return { positions, colors };
}

/* ---------- Forma inicial: esfera de puntos en tonos del portafolio ---------- */
function sphereShape() {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color('#6eea8e'), new THREE.Color('#826cf6'), new THREE.Color('#f5f5f7'), new THREE.Color('#a99bff')];
    const radius = SIZE * 0.5;
    for (let i = 0; i < COUNT; i++) {
        const u = Math.random() * 2 - 1;
        const phi = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const r = radius * (0.92 + Math.random() * 0.08);
        positions[i * 3] = r * s * Math.cos(phi);
        positions[i * 3 + 1] = r * u;
        positions[i * 3 + 2] = r * s * Math.sin(phi);
        const c = palette[i % palette.length];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
}

const vertexShader = /* glsl */ `
    attribute vec3 aTo;
    attribute vec3 aColor;
    attribute vec3 aColorTo;
    attribute float aSeed;
    uniform float uProgress;
    uniform float uTime;
    uniform float uSize;
    uniform float uScatter;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        // Cada partícula arranca con un pequeño retraso propio.
        float delay = aSeed * 0.4;
        float t = clamp((uProgress - delay) / 0.6, 0.0, 1.0);
        t = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;

        vec3 pos = mix(position, aTo, t);

        // Dispersión a mitad del viaje: hacia fuera y con remolino.
        float burst = sin(t * 3.14159265);
        vec3 dir = normalize(position + aTo + vec3(0.001, 0.002, 0.003));
        vec3 swirl = vec3(
            sin(aSeed * 91.7 + uTime * 0.8),
            cos(aSeed * 47.3 + uTime * 0.7),
            sin(aSeed * 13.1 + uTime * 0.9)
        );
        pos += (dir * 0.9 + swirl) * burst * uScatter * (0.5 + aSeed);

        // Vibración leve en reposo.
        pos += 0.012 * vec3(sin(uTime * 1.3 + aSeed * 40.0), cos(uTime * 1.1 + aSeed * 30.0), sin(uTime * 0.9 + aSeed * 20.0));

        vColor = mix(aColor, aColorTo, t);
        vAlpha = 0.6 + 0.4 * sin(uTime * 2.4 + aSeed * 120.0);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.55 + aSeed * 0.9) / -mv.z;
    }
`;

const fragmentShader = /* glsl */ `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * glow * vAlpha, 1.0);
    }
`;

async function init() {
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    const pixelRatio = Math.min(devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const start = sphereShape();
    const geometry = new THREE.BufferGeometry();
    const seeds = new Float32Array(COUNT).map(() => Math.random());
    geometry.setAttribute('position', new THREE.BufferAttribute(start.positions.slice(), 3));
    geometry.setAttribute('aTo', new THREE.BufferAttribute(start.positions.slice(), 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(start.colors.slice(), 3));
    geometry.setAttribute('aColorTo', new THREE.BufferAttribute(start.colors.slice(), 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: (small ? 34 : 30) * pixelRatio },
        uScatter: { value: 1.1 }
    };
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    const rig = new THREE.Group();
    rig.add(points);
    scene.add(rig);

    /* ---------- Encuadre según el ancho ---------- */
    const layout = { x: 0, y: 0, scale: 1 };
    const copy = hero.querySelector('.hero-copy');
    const actions = hero.querySelector('.actions');
    const social = hero.querySelector('.hero-social');
    function resize() {
        const width = host.clientWidth;
        const height = host.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (camera.aspect >= 1.1) Object.assign(layout, { x: Math.min(2.5, 1.1 * camera.aspect), y: -0.1, scale: 1 });
        else {
            // En vertical, se centra en el hueco entre «Mi formación» y GitHub / LinkedIn.
            // offsetTop no incluye las transformaciones de la intro, así que el cálculo es estable.
            const top = copy.offsetTop + actions.offsetTop + actions.offsetHeight;
            const bottom = social.offsetTop;
            const gap = Math.max(bottom - top, 160);
            const view = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const unit = view / height; // unidades de escena por píxel
            Object.assign(layout, {
                x: 0,
                y: (0.5 - (top + gap / 2) / height) * view,
                scale: Math.min(0.9, (Math.min(gap, width) * 0.85 * unit) / SIZE)
            });
        }
        rig.position.set(layout.x, layout.y, 0);
        rig.scale.setScalar(layout.scale);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    observer.observe(copy);
    resize();

    const shapes = await Promise.all(LOGOS.map(sampleLogo));
    const from = geometry.attributes.position;
    const to = geometry.attributes.aTo;
    const colorFrom = geometry.attributes.aColor;
    const colorTo = geometry.attributes.aColorTo;

    // Fija la forma actual como origen y prepara la siguiente como destino.
    function target(shape) {
        from.array.set(to.array);
        colorFrom.array.set(colorTo.array);
        to.array.set(shape.positions);
        colorTo.array.set(shape.colors);
        from.needsUpdate = to.needsUpdate = colorFrom.needsUpdate = colorTo.needsUpdate = true;
        uniforms.uProgress.value = 0;
    }

    if (reduced) {
        target(shapes[0]);
        uniforms.uProgress.value = 1;
        const draw = () => renderer.render(scene, camera);
        new ResizeObserver(draw).observe(host);
        draw();
        return;
    }

    let index = -1;
    let phase = 'sphere'; // sphere → morph → hold → morph → …
    let clock = 0;
    let started = false;
    const begin = () => (started = true);
    if (window.__introStarted) begin();
    else addEventListener('portfolio:intro', begin, { once: true });

    function next() {
        // Al salir de la esfera, el giro acumulado se normaliza para no «desenrollarse».
        if (phase === 'sphere') rig.rotation.y = Math.atan2(Math.sin(rig.rotation.y), Math.cos(rig.rotation.y));
        index = (index + 1) % LOGOS.length;
        target(shapes[index]);
        phase = 'morph';
        clock = 0;
    }

    // Cursor: inclinación suave.
    const tilt = { x: 0, y: 0 };
    if (finePointer) {
        addEventListener('pointermove', (event) => {
            tilt.x = (event.clientY / innerHeight - 0.5) * 0.35;
            tilt.y = (event.clientX / innerWidth - 0.5) * 0.5;
        });
    }

    // Solo se anima mientras el hero está en pantalla.
    let visible = true;
    if (hero) new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(hero);

    let last = performance.now();
    let elapsed = 0;
    renderer.setAnimationLoop((time) => {
        const dt = Math.min((time - last) / 1000, 0.05);
        last = time;
        if (!visible || document.hidden) return;
        elapsed += dt;
        clock += dt;
        uniforms.uTime.value = elapsed;

        if (phase === 'sphere') {
            if (started && clock > 1.6) next();
        } else if (phase === 'morph') {
            uniforms.uProgress.value = Math.min(1, clock / MORPH);
            if (clock >= MORPH) {
                phase = 'hold';
                clock = 0;
            }
        } else if (clock >= HOLD) {
            next();
        }

        // La esfera gira sobre sí misma; los logos se balancean para mostrar su volumen.
        const spin = phase === 'sphere' ? elapsed * 0.35 : Math.sin(elapsed * 0.45) * 0.42;
        rig.rotation.y += (spin + tilt.y - rig.rotation.y) * 0.05;
        rig.rotation.x += (tilt.x * 0.6 - rig.rotation.x) * 0.05;

        renderer.render(scene, camera);
    });
}

if (host) {
    init().catch((error) => {
        host.hidden = true;
        console.warn('Las partículas no están disponibles. El contenido sigue accesible.', error);
    });
}
