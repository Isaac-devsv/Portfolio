/* =========================================================
   Loader de primera visita
   Independiente de GSAP y de los CDN: se anima y se cierra solo
   (al cargar la página o, como máximo, a los 4 s). En todas las
   pantallas muestra la esfera «Particle Tether» (inspirada en
   originkit) con la paleta del sitio.
   ========================================================= */
(function () {
    var root = document.documentElement;
    var loader = document.querySelector('.loader');
    if (!loader) return;
    if (!root.classList.contains('is-loading')) {
        loader.remove();
        return;
    }

    var MIN = 900; // ms mínimos visibles
    var MAX = 4000; // ms máximos aunque la red sea lenta
    var started = performance.now();
    var bar = loader.querySelector('.loader-bar span');
    var canvas = loader.querySelector('.loader-tether');
    var useTether = !!canvas;
    var progress = 0;
    var target = 0.85;
    var done = false;
    var frame = 0;

    /* ---------- Particle Tether: puntos en esfera de Fibonacci ---------- */
    var ctx, size, dpr, dots;
    var COUNT = 260;
    var CYCLE = 3600; // ms por ciclo: esfera → anillo → esfera
    var TILT = -0.42; // inclinación para ver el anillo como elipse
    var MINT = [110, 234, 142];
    var VIOLET = [130, 108, 246];

    if (useTether) {
        ctx = canvas.getContext('2d');
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        size = canvas.clientWidth || 150;
        canvas.width = canvas.height = Math.round(size * dpr);
        ctx.scale(dpr, dpr);
        dots = [];
        var golden = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < COUNT; i++) {
            var y = 1 - (2 * (i + 0.5)) / COUNT;
            var t = i / (COUNT - 1);
            dots.push({
                theta: Math.acos(y),
                phi: i * golden,
                color: [
                    Math.round(MINT[0] + (VIOLET[0] - MINT[0]) * t),
                    Math.round(MINT[1] + (VIOLET[1] - MINT[1]) * t),
                    Math.round(MINT[2] + (VIOLET[2] - MINT[2]) * t)
                ]
            });
        }
    }

    function ease(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // 0 = esfera, 1 = anillo ecuatorial. Ciclo: mantiene, colapsa, mantiene, se abre.
    function collapse(p) {
        if (p < 0.2) return 0;
        if (p < 0.45) return ease((p - 0.2) / 0.25);
        if (p < 0.6) return 1;
        if (p < 0.85) return 1 - ease((p - 0.6) / 0.25);
        return 0;
    }

    function drawTether(now) {
        var p = ((now - started) % CYCLE) / CYCLE;
        var k = collapse(p);
        var spin = p * Math.PI * 2;
        var r = size * 0.36;
        var c = size / 2;
        var cosT = Math.cos(TILT);
        var sinT = Math.sin(TILT);
        var list = [];
        for (var i = 0; i < dots.length; i++) {
            var d = dots[i];
            // Se interpola el ángulo polar: los puntos se deslizan por la superficie.
            var theta = d.theta + (Math.PI / 2 + (d.theta - Math.PI / 2) * 0.06 - d.theta) * k;
            var phi = d.phi + spin;
            var x = Math.sin(theta) * Math.cos(phi);
            var y = Math.cos(theta);
            var z = Math.sin(theta) * Math.sin(phi);
            var y2 = y * cosT - z * sinT;
            var z2 = y * sinT + z * cosT;
            var persp = 1 / (1 - z2 * 0.22);
            list.push({ x: c + x * r * persp, y: c - y2 * r * persp, z: z2, color: d.color });
        }
        list.sort(function (a, b) {
            return a.z - b.z;
        });
        ctx.clearRect(0, 0, size, size);
        for (var j = 0; j < list.length; j++) {
            var q = list[j];
            var depth = (q.z + 1) / 2; // 0 = fondo, 1 = frente
            ctx.fillStyle = 'rgba(' + q.color[0] + ',' + q.color[1] + ',' + q.color[2] + ',' + (0.18 + depth * 0.82).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(q.x, q.y, 0.9 + depth * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function tick(now) {
        progress += (target - progress) * 0.05;
        if (bar) bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
        if (useTether) drawTether(now);
        frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    function finish() {
        if (done) return;
        done = true;
        target = 1;
        try {
            sessionStorage.setItem('if-visited', '1');
        } catch (e) {}
        setTimeout(function () {
            loader.classList.add('is-leaving');
            window.__loaderDone = true;
            dispatchEvent(new Event('portfolio:loaded'));
            setTimeout(function () {
                cancelAnimationFrame(frame);
                root.classList.remove('is-loading');
                loader.remove();
            }, 650);
        }, 300);
    }

    function whenReady() {
        var wait = Math.max(0, MIN - (performance.now() - started));
        setTimeout(finish, wait);
    }

    if (document.readyState === 'complete') whenReady();
    else addEventListener('load', whenReady, { once: true });
    setTimeout(finish, MAX);
})();
