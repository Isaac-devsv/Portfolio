/* =========================================================
   Portafolio · Isaac Flores — interacción y movimiento (v5)
   GSAP (ScrollTrigger + SplitText) · Lenis · componentes
   inspirados en originkit: Click Effects, Neon Border,
   Live Chat, Round Carousel y botones Glass / Moving Gradient.
   ========================================================= */
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
// Si el respaldo de la <head> ya mostró el contenido sin animación, no se reanima (evita saltos).
const motion = Boolean(window.gsap && window.ScrollTrigger) && !reduceMotion && !root.classList.contains('no-motion');
const entering = root.classList.contains('is-entering');
const loading = root.classList.contains('is-loading');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!motion) {
    root.classList.add('no-motion');
    root.classList.remove('is-entering');
}
root.classList.add('motion-ready');

if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
}

/* ---------- Scroll suave (Lenis) sincronizado con ScrollTrigger ---------- */
let lenis = null;
if (motion && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    if (loading) lenis.stop();
}

/* ---------- Menú de navegación ---------- */
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    navigation.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && motion) {
        gsap.fromTo(
            navigation.children,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'expo.out', delay: 0.05 }
        );
    }
}

menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) {
        setMenu(false);
        menuButton.focus();
    }
});
matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
    if (!event.matches) return;
    setMenu(false);
    if (motion) gsap.set(navigation.children, { clearProps: 'opacity,transform' });
});

/* ---------- Cabecera: se oculta al bajar y vuelve al subir ---------- */
let lastScroll = 0;
addEventListener(
    'scroll',
    () => {
        const y = window.scrollY;
        header.classList.toggle('is-hidden', y > lastScroll && y > 300 && !navigation.classList.contains('open'));
        lastScroll = y;
    },
    { passive: true }
);

/* ---------- Año, reloj local y volver arriba ---------- */
document.querySelectorAll('#year').forEach((el) => (el.textContent = new Date().getFullYear()));
const timeFormat = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', hour: 'numeric', minute: '2-digit' });
const clocks = document.querySelectorAll('[data-clock]');
if (clocks.length) {
    const tick = () => clocks.forEach((el) => (el.textContent = timeFormat.format(new Date())));
    tick();
    setInterval(tick, 15000);
}
document.querySelectorAll('[data-top]').forEach((button) =>
    button.addEventListener('click', () => {
        if (lenis) lenis.scrollTo(0, { duration: 1.6 });
        else scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    })
);

/* ---------- Texto que se descifra (nav y botón de copiar) ---------- */
const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFXYZ01';
function scramble(el, text = el.textContent.trim()) {
    if (reduceMotion) return;
    let step = 0;
    cancelAnimationFrame(el._scramble);
    const run = () => {
        el.textContent = text
            .split('')
            .map((char, i) => (char === ' ' || i < step / 2 ? char : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
            .join('');
        step++;
        if (step / 2 <= text.length) el._scramble = requestAnimationFrame(run);
        else el.textContent = text;
    };
    run();
}
document.querySelectorAll('[data-scramble]').forEach((link) => {
    const original = link.textContent.trim();
    link.setAttribute('aria-label', original);
    link.addEventListener('pointerenter', () => scramble(link, original));
});

/* ---------- Aviso flotante y copiar correo ---------- */
const toast = document.createElement('div');
toast.className = 'toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');
document.body.append(toast);
let toastTimer;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
document.querySelectorAll('[data-copy]').forEach((button) => {
    if (button.hasAttribute('data-encrypt')) {
        button.addEventListener('pointerenter', () => {
            if (!button.classList.contains('copied')) scramble(button, 'Copiar');
        });
    }
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(button.dataset.copy);
            button.classList.add('copied');
            button.textContent = 'Copiado ✓';
            showToast('Correo copiado al portapapeles');
            setTimeout(() => {
                button.classList.remove('copied');
                button.textContent = 'Copiar';
            }, 2200);
        } catch {
            location.href = `mailto:${button.dataset.copy}`;
        }
    });
});

/* ---------- Tiles: brillo que sigue al cursor ---------- */
document.querySelectorAll('.tile').forEach((tile) =>
    tile.addEventListener('pointermove', (event) => {
        const rect = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        tile.style.setProperty('--my', `${event.clientY - rect.top}px`);
    })
);

/* ---------- Neon Border: línea de luz + bloom por capas ---------- */
document.querySelectorAll('[data-neon]').forEach((el) => {
    el.classList.add('neon-frame');
    el.insertAdjacentHTML(
        'beforeend',
        '<span class="neon-bloom" aria-hidden="true"></span><span class="neon-glow" aria-hidden="true"></span><span class="neon-line" aria-hidden="true"></span>'
    );
});

/* ---------- Redes aún sin URL: avisan en lugar de navegar ---------- */
document.querySelectorAll('[data-pending]').forEach((link) =>
    link.addEventListener('click', (event) => {
        event.preventDefault();
        showToast(`${link.dataset.pending}: próximamente`);
    })
);

/* ---------- Carnet: cae, se mece al pasar el cursor y se balancea al pulsarlo ---------- */
function initBadge(stage) {
    const hang = stage.querySelector('.badge-hang');
    if (!motion) return;

    gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 75%', once: true } })
        .from(hang, { yPercent: -35, opacity: 0, duration: 0.9, ease: 'power3.in' })
        .to(hang, { rotation: 7, duration: 0.3, ease: 'power2.out' })
        .to(hang, { rotation: -5, duration: 0.55, ease: 'sine.inOut' })
        .to(hang, { rotation: 2, duration: 0.5, ease: 'sine.inOut' })
        .to(hang, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });

    const tiltX = gsap.quickTo(hang, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const tiltY = gsap.quickTo(hang, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    hang.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') hang.classList.add('is-swaying');
    });
    hang.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = hang.getBoundingClientRect();
        const px = gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width);
        const py = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height);
        tiltX(-(py - 0.5) * 10);
        tiltY((px - 0.5) * 18);
    });
    hang.addEventListener('pointerleave', () => {
        hang.classList.remove('is-swaying');
        tiltX(0);
        tiltY(0);
    });

    hang.addEventListener('click', (event) => {
        const rect = hang.getBoundingClientRect();
        const side = event.clientX && event.clientX < rect.left + rect.width / 2 ? 1 : -1;
        gsap.killTweensOf(hang, 'rotation,y');
        gsap.timeline()
            .to(hang, { y: 10, duration: 0.12, ease: 'power2.out' })
            .to(hang, { y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }, '>');
        gsap.timeline()
            .to(hang, { rotation: 16 * side, duration: 0.35, ease: 'power2.out' })
            .to(hang, { rotation: -11 * side, duration: 0.6, ease: 'sine.inOut' })
            .to(hang, { rotation: 6 * side, duration: 0.55, ease: 'sine.inOut' })
            .to(hang, { rotation: -3 * side, duration: 0.5, ease: 'sine.inOut' })
            .to(hang, { rotation: 0, duration: 1, ease: 'elastic.out(1, 0.45)' });
    });
}
document.querySelectorAll('[data-badge]').forEach(initBadge);

/* ---------- «Más de cerca»: píldoras desplegables ---------- */
document.querySelectorAll('[data-disclosures]').forEach((group) => {
    const items = [...group.querySelectorAll('.disclosure')];
    const setOpen = (item, open) => {
        const button = item.querySelector('button');
        const panel = item.querySelector('.disclosure-panel');
        item.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        if (motion) gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.55, ease: 'expo.out' });
        else panel.style.height = open ? 'auto' : '0px';
    };
    items.forEach((item) =>
        item.querySelector('button').addEventListener('click', () => {
            const open = !item.classList.contains('is-open');
            items.forEach((other) => other !== item && other.classList.contains('is-open') && setOpen(other, false));
            setOpen(item, open);
        })
    );
});

/* ---------- Live Chat: conversación de ejemplo + mensaje real por WhatsApp ---------- */
function initChat(chat) {
    const body = chat.querySelector('[data-chat-body]');
    const form = chat.querySelector('[data-chat-form]');
    const input = form.querySelector('input');
    const messages = [...body.querySelectorAll('.msg')];
    const base = Date.now() - messages.length * 60000;
    messages.forEach((msg, i) => (msg.querySelector('time').textContent = timeFormat.format(new Date(base + i * 60000))));

    const scrollDown = () => body.scrollTo({ top: body.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    const typing = () => {
        const bubble = document.createElement('div');
        bubble.className = 'msg in typing';
        bubble.setAttribute('aria-hidden', 'true');
        bubble.innerHTML = '<p><i></i><i></i><i></i></p>';
        body.append(bubble);
        scrollDown();
        return bubble;
    };
    const reveal = (msg) => {
        msg.hidden = false;
        if (motion) {
            gsap.from(msg, {
                y: 16,
                opacity: 0,
                scale: 0.96,
                transformOrigin: msg.classList.contains('out') ? '100% 100%' : '0% 100%',
                duration: 0.5,
                ease: 'back.out(1.6)'
            });
        }
        scrollDown();
    };

    if (motion) {
        messages.forEach((msg) => (msg.hidden = true));
        ScrollTrigger.create({
            trigger: chat,
            start: 'top 70%',
            once: true,
            onEnter: async () => {
                for (const msg of messages) {
                    if (msg.classList.contains('in')) {
                        const bubble = typing();
                        await wait(900);
                        bubble.remove();
                    } else {
                        await wait(650);
                    }
                    reveal(msg);
                    await wait(350);
                }
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) {
            input.focus();
            if (motion) gsap.fromTo(form, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
            return;
        }
        // Se abre en el mismo gesto del usuario para que el navegador no lo bloquee.
        window.open(`https://wa.me/50379475032?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        const mine = document.createElement('div');
        mine.className = 'msg out';
        mine.innerHTML = `<time>${timeFormat.format(new Date())}</time><p></p>`;
        mine.querySelector('p').textContent = text;
        body.append(mine);
        reveal(mine);
        input.value = '';
        const bubble = typing();
        await wait(900);
        bubble.remove();
        const reply = document.createElement('div');
        reply.className = 'msg in';
        reply.innerHTML = `<time>${timeFormat.format(new Date())}</time><p>¡Gracias! Te abrí WhatsApp para seguir la conversación. 🙌</p>`;
        body.append(reply);
        reveal(reply);
    });
}
document.querySelectorAll('[data-chat]').forEach(initChat);

/* ---------- Round Carousel: un logo por tarjeta ---------- */
const TECH_INFO = {
    HTML: 'Estructura semántica y accesible: la base de toda interfaz.',
    CSS: 'Layouts con Flexbox y Grid, diseño responsive y animaciones.',
    JavaScript: 'Lógica, manipulación del DOM, eventos y consumo de APIs con fetch.',
    React: 'Componentes, props, estado, hooks y estado compartido con Context API.',
    Git: 'Control de versiones: ramas, commits y un historial ordenado.',
    GitHub: 'Repositorios remotos, colaboración y publicación de proyectos.',
    Bootstrap: 'Prototipos rápidos con su sistema de grillas y componentes.',
    'VS Code': 'Mi editor de trabajo: extensiones, depuración y terminal integrada.',
    'Three.js': 'Escenas 3D en el navegador, como las partículas del inicio de este portafolio.'
};

function initRing(stage) {
    const ring = stage.querySelector('.ring');
    const cards = [...ring.querySelectorAll('.ring-card')];
    const name = document.querySelector('[data-ring-name]');
    const desc = document.querySelector('[data-ring-desc]');
    const count = cards.length;
    const step = 360 / count;
    const state = { angle: 0 };
    let radius = 300;
    let velocity = 0;
    let dragging = null;
    let hovering = false;
    let active = -1;

    function render() {
        cards.forEach((card, i) => {
            const theta = i * step + state.angle;
            const facing = (Math.cos((theta * Math.PI) / 180) + 1) / 2;
            card.style.transform = `rotateY(${theta}deg) translateZ(${radius}px)`;
            card.style.filter = `brightness(${(0.3 + facing * 0.7).toFixed(3)})`;
            card.style.zIndex = Math.round(facing * 100);
        });
        const index = ((Math.round(-state.angle / step) % count) + count) % count;
        if (index !== active) {
            active = index;
            const label = cards[index].querySelector('figcaption').textContent;
            name.textContent = label;
            desc.textContent = TECH_INFO[label] || '';
        }
    }

    function measure() {
        const width = Math.min(230, Math.max(140, innerWidth * 0.2));
        stage.style.setProperty('--card-w', `${width}px`);
        stage.style.setProperty('--card-h', `${width * 1.18}px`);
        radius = (width / 2 / Math.tan(Math.PI / count)) * 1.12;
        ring.style.transform = `translateZ(${-radius}px)`;
        render();
    }

    const snapTo = (angle) => {
        velocity = 0;
        if (motion) gsap.to(state, { angle, duration: 0.9, ease: 'expo.out', onUpdate: render });
        else {
            state.angle = angle;
            render();
        }
    };
    const nearest = () => Math.round(state.angle / step) * step;

    document.querySelector('[data-ring-prev]')?.addEventListener('click', () => snapTo(nearest() + step));
    document.querySelector('[data-ring-next]')?.addEventListener('click', () => snapTo(nearest() - step));
    stage.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') snapTo(nearest() + step);
        if (event.key === 'ArrowRight') snapTo(nearest() - step);
    });
    cards.forEach((card, i) =>
        card.addEventListener('click', () => {
            if (dragging?.moved) return;
            // Gira por el camino más corto hasta dejar esa tarjeta al frente.
            const delta = ((((-i * step - state.angle) % 360) + 540) % 360) - 180;
            snapTo(state.angle + delta);
        })
    );

    measure();
    addEventListener('resize', measure);
    if (!motion) return;

    stage.addEventListener('pointerenter', () => (hovering = true));
    stage.addEventListener('pointerleave', () => (hovering = false));
    stage.addEventListener('pointerdown', (event) => {
        gsap.killTweensOf(state);
        dragging = { x: event.clientX, last: event.clientX, moved: false };
    });
    addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - dragging.last;
        dragging.last = event.clientX;
        if (Math.abs(event.clientX - dragging.x) > 5) dragging.moved = true;
        state.angle += dx * 0.35;
        velocity = dx * 0.35;
        render();
    });
    const release = () => {
        if (!dragging) return;
        const wasMoved = dragging.moved;
        // Se libera en el siguiente tick para que el clic de la tarjeta sepa si hubo arrastre.
        setTimeout(() => (dragging = null), 0);
        if (wasMoved) snapTo(Math.round((state.angle + velocity * 12) / step) * step);
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);

    let visible = false;
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(stage);
    gsap.ticker.add((_, delta) => {
        if (!visible || dragging || hovering || gsap.isTweening(state)) return;
        state.angle -= (delta / 1000) * 9;
        render();
    });
}
document.querySelectorAll('[data-ring]').forEach(initRing);

/* =========================================================
   A partir de aquí: solo con movimiento habilitado
   ========================================================= */
if (motion) {
    const curtain = document.querySelector('.curtain');
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1200)]);

    /* ---------- Cursor: anillo + punto con etiqueta contextual ---------- */
    if (finePointer) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor is-hidden';
        cursor.setAttribute('aria-hidden', 'true');
        cursor.innerHTML = '<span class="cursor-dot"></span><span class="cursor-ring"><em></em></span>';
        document.body.append(cursor);
        root.classList.add('has-cursor');
        const dot = cursor.querySelector('.cursor-dot');
        const ringEl = cursor.querySelector('.cursor-ring');
        const label = ringEl.querySelector('em');
        const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
        const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
        const ringX = gsap.quickTo(ringEl, 'x', { duration: 0.5, ease: 'power3' });
        const ringY = gsap.quickTo(ringEl, 'y', { duration: 0.5, ease: 'power3' });
        addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            dotX(event.clientX);
            dotY(event.clientY);
            ringX(event.clientX);
            ringY(event.clientY);
            cursor.classList.remove('is-hidden');
        });
        root.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
        document.addEventListener('pointerover', (event) => {
            const labelled = event.target.closest('[data-cursor]');
            const interactive = event.target.closest('a, button, input, [role="button"], [data-ring]');
            cursor.classList.toggle('is-label', Boolean(labelled));
            cursor.classList.toggle('is-hover', Boolean(interactive) && !labelled);
            if (labelled) label.textContent = labelled.dataset.cursor;
        });
    }

    /* ---------- Click Effects: ráfaga de rayos + anillo en cada clic ---------- */
    let lastClick = 0;
    addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || performance.now() - lastClick < 60) return;
        lastClick = performance.now();
        const fx = document.createElement('div');
        fx.className = 'click-fx';
        fx.setAttribute('aria-hidden', 'true');
        fx.style.left = `${event.clientX}px`;
        fx.style.top = `${event.clientY}px`;
        fx.innerHTML = '<b></b>' + '<i></i>'.repeat(8);
        document.body.append(fx);
        fx.querySelectorAll('i').forEach((ray, i, rays) => {
            const angle = (i / rays.length) * 360 + 22.5;
            const rad = ((angle - 90) * Math.PI) / 180;
            ray.style.background = i % 2 ? '#826cf6' : '#6eea8e';
            gsap.fromTo(
                ray,
                { rotation: angle, x: Math.cos(rad) * 8, y: Math.sin(rad) * 8, scaleY: 1, opacity: 1 },
                { x: Math.cos(rad) * 34, y: Math.sin(rad) * 34, scaleY: 0.2, opacity: 0, duration: 0.45, ease: 'expo.out' }
            );
        });
        gsap.fromTo(
            fx.querySelector('b'),
            { scale: 0.2, opacity: 1 },
            { scale: 3.4, opacity: 0, duration: 0.55, ease: 'expo.out', onComplete: () => fx.remove() }
        );
    });

    /* ---------- Botones magnéticos ---------- */
    if (finePointer) {
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
            el.addEventListener('pointermove', (event) => {
                const rect = el.getBoundingClientRect();
                xTo((event.clientX - (rect.left + rect.width / 2)) * 0.25);
                yTo((event.clientY - (rect.top + rect.height / 2)) * 0.35);
            });
            el.addEventListener('pointerleave', () => {
                xTo(0);
                yTo(0);
            });
        });
    }

    /* ---------- Transición entre páginas (cortina) ---------- */
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target && link.target !== '_self') return;
        const url = new URL(link.href, location.href);
        if (url.protocol !== location.protocol || url.origin !== location.origin) return;
        if (url.pathname === location.pathname) return;
        event.preventDefault();
        if (navigation.classList.contains('open')) setMenu(false);
        try {
            sessionStorage.setItem('if-transition', '1');
        } catch {}
        gsap.fromTo(
            curtain,
            { yPercent: 100 },
            { yPercent: 0, duration: 0.8, ease: 'expo.inOut', onComplete: () => (location.href = url.href) }
        );
    });
    addEventListener('pageshow', (event) => {
        if (event.persisted) gsap.set(curtain, { yPercent: 100 });
    });

    /* ---------- Loader de primera visita (lo anima y cierra loader.js) ---------- */
    function runLoader() {
        try {
            sessionStorage.setItem('if-visited', '1');
        } catch {}
        const opened = () => {
            if (lenis) lenis.start();
        };
        if (!loading || window.__loaderDone) return Promise.resolve().then(opened);
        return new Promise((resolve) => addEventListener('portfolio:loaded', resolve, { once: true })).then(opened);
    }

    /* ---------- Intro y títulos ---------- */
    Promise.all([runLoader(), fontsReady]).then(() => {
        window.__introStarted = true;
        dispatchEvent(new Event('portfolio:intro'));
        const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });

        if (entering) {
            intro.to(curtain, { yPercent: -100, duration: 1, ease: 'expo.inOut' }).add(() => {
                root.classList.remove('is-entering');
                gsap.set(curtain, { clearProps: 'transform' });
            });
        }

        const heroTitle = document.querySelector('[data-split-hero]');
        if (heroTitle) {
            const at = entering ? '-=0.45' : 0.05;
            if (window.SplitText) {
                const split = SplitText.create(heroTitle, { type: 'lines', mask: 'lines' });
                intro.set(heroTitle, { opacity: 1 }, at);
                intro.from(split.lines, { yPercent: 115, duration: 1.4, stagger: 0.12 }, '<');
            } else {
                intro.to(heroTitle, { opacity: 1, duration: 1 }, at);
            }
        }
        const heroItems = document.querySelectorAll('[data-hero-item]');
        if (heroItems.length) {
            intro.fromTo(
                heroItems,
                { opacity: 0, y: 24, filter: 'blur(8px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.1, clearProps: 'filter' },
                heroTitle ? '-=1.1' : 0.2
            );
        }

        // Títulos de sección: líneas que emergen de una máscara.
        document.querySelectorAll('[data-split]').forEach((el) => {
            if (!window.SplitText) {
                gsap.fromTo(el, { opacity: 0, y: 40 }, {
                    opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
                    scrollTrigger: { trigger: el, start: 'top 88%', once: true }
                });
                return;
            }
            gsap.set(el, { opacity: 1 });
            SplitText.create(el, {
                type: 'lines',
                mask: 'lines',
                autoSplit: true,
                onSplit: (self) =>
                    gsap.from(self.lines, {
                        yPercent: 110,
                        duration: 1.2,
                        stagger: 0.1,
                        ease: 'expo.out',
                        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
                    })
            });
        });

        // Declaración: las palabras se encienden al ritmo del scroll (patrón Apple).
        document.querySelectorAll('[data-words]').forEach((el) => {
            if (!window.SplitText) return;
            const split = SplitText.create(el, { type: 'words' });
            gsap.fromTo(
                split.words,
                { opacity: 0.14 },
                {
                    opacity: 1,
                    stagger: 0.1,
                    ease: 'none',
                    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
                }
            );
        });

        ScrollTrigger.refresh();
    });

    /* ---------- Barra de progreso de lectura ---------- */
    const progressBar = document.querySelector('.scroll-progress');
    if (progressBar) gsap.to(progressBar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    /* ---------- Intro de páginas internas: se aleja al desplazar ---------- */
    const pageIntro = document.querySelector('.page-intro');
    if (pageIntro) {
        gsap.to(pageIntro.querySelector('h1'), {
            yPercent: -15,
            opacity: 0.2,
            ease: 'none',
            scrollTrigger: { trigger: pageIntro, start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    /* ---------- Revelados al hacer scroll ---------- */
    ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
            gsap.fromTo(
                batch,
                { opacity: 0, y: 40, filter: 'blur(6px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.08, ease: 'expo.out', overwrite: true, clearProps: 'filter' }
            )
    });
    ScrollTrigger.batch('[data-tile]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
            gsap.from(batch, { y: 70, scale: 0.96, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out', clearProps: 'transform' })
    });
    document.querySelectorAll('[data-stagger]').forEach((group) =>
        gsap.fromTo(
            group.children,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: group, start: 'top 88%', once: true } }
        )
    );

    /* ---------- Proyecto: crece hasta su tamaño (escala Apple) ---------- */
    document.querySelectorAll('[data-scale-in]').forEach((el) => {
        gsap.fromTo(
            el,
            { scale: 0.84, yPercent: 8 },
            { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center 55%', scrub: 1 } }
        );
    });
    document.querySelectorAll('[data-parallax]').forEach((img) => {
        gsap.fromTo(
            img,
            { yPercent: -12 },
            { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
    });

    /* ---------- Contadores ---------- */
    document.querySelectorAll('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const counter = { value: 0 };
        el.textContent = '0';
        gsap.to(counter, {
            value: end,
            duration: 2,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            onUpdate: () => (el.textContent = Math.round(counter.value))
        });
    });

    /* ---------- Terminal: las líneas se escriben solas ---------- */
    document.querySelectorAll('[data-type]').forEach((code) => {
        const lines = code.querySelectorAll('.ln');
        gsap.set(lines, { clipPath: 'inset(0 100% 0 0)' });
        const typing = gsap.timeline({ scrollTrigger: { trigger: code, start: 'top 80%', once: true }, delay: 0.3 });
        lines.forEach((line) => {
            const chars = Math.max(line.textContent.length, 4);
            typing.to(line, { clipPath: 'inset(0 0% 0 0)', duration: chars * 0.026, ease: `steps(${chars})` });
        });
    });

    /* ---------- Línea de tiempo de formación ---------- */
    const timeline = document.querySelector('.timeline');
    if (timeline) {
        ScrollTrigger.create({
            trigger: timeline,
            start: 'top 65%',
            end: 'bottom 65%',
            onUpdate: (self) => timeline.style.setProperty('--progress', self.progress.toFixed(3))
        });
        timeline.querySelectorAll('li').forEach((item) =>
            ScrollTrigger.create({ trigger: item, start: 'top 65%', end: 'max', toggleClass: { targets: item, className: 'is-active' } })
        );
    }

    addEventListener('load', () => ScrollTrigger.refresh());
} else {
    try {
        sessionStorage.setItem('if-visited', '1');
    } catch {}
    const timeline = document.querySelector('.timeline');
    if (timeline) {
        timeline.style.setProperty('--progress', '1');
        timeline.querySelectorAll('li').forEach((item) => item.classList.add('is-active'));
    }
}
