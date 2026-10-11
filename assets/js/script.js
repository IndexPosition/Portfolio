const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLITCH_CHARS = "#$%&*+-./:;<=>?@[]^_{|}~";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randChar = () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];

// Decodes a text node into `text`: noise first, letters settle left to right
async function decode(node, text, frames = 10, speed = 30) {
    for (let f = 1; f <= frames; f++) {
        const settled = Math.floor((f / frames) * text.length);
        node.nodeValue = text.slice(0, settled) + [...text.slice(settled)].map((c) => (c === " " ? " " : randChar())).join("");
        await sleep(speed);
    }
}

const textNodes = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2) });
    const out = [];
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("year").textContent = new Date().getFullYear();

    /*=============== THEME ===============*/
    const toggle = document.getElementById("theme-toggle");
    const circuit = getComputedStyle(document.body).backgroundImage.match(/url\("(data:image\/svg\+xml.*?)"\)/);
    const litCircuit = circuit && `url("${circuit[1].replace("fill='royalblue' fill-opacity='0.1'", "fill='deepskyblue' fill-opacity='0.85'")}")`;

    toggle.addEventListener("click", () => {
        const root = document.documentElement;
        const next = root.dataset.theme === "light" ? "dark" : "light";
        const apply = () => {
            root.dataset.theme = next;
            try { localStorage.setItem("theme", next); } catch (e) { }
        };
        if (reducedMotion) return apply();
        if (document.querySelector(".bricks")) return; // already mid-switch

        const size = 64;
        const cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
        const r = toggle.getBoundingClientRect();
        const ox = (r.left + r.width / 2) / size, oy = (r.top + r.height / 2) / size;
        const far = Math.hypot(cols, rows);

        const wall = document.createElement("div");
        wall.className = "bricks";
        wall.dataset.to = next;
        wall.style.gridTemplate = `repeat(${rows}, 1fr) / repeat(${cols}, 1fr)`;
        if (litCircuit) wall.style.setProperty("--lit", litCircuit);
        const bricks = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const b = document.createElement("i");
                b.style.animationDelay = `${Math.round((Math.hypot(x - ox, y - oy) / far) * 220 + Math.random() * 80)}ms`;
                // Offset each brick's slice so the traces line up with the page's (scrolling) background
                b.style.backgroundPosition = `${-x * size}px ${-y * size - scrollY}px`;
                if (Math.random() < 0.06) b.className = "hot"; // a few solid blue bricks for the glitch look
                bricks.push(b);
            }
        }
        wall.append(...bricks);
        document.body.append(wall);

        setTimeout(() => {
            apply();
            wall.classList.add("out");
            bricks.forEach((b) => (b.style.animationDelay = `${Math.round(Math.random() * 160)}ms`));
            setTimeout(() => wall.remove(), 300);
        }, 410);
    });

    /*=============== NAV ===============*/
    const header = document.getElementById("header");
    const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 10);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Lit trace segment glides under the hovered link, falls back to the active one
    const navList = document.querySelector(".nav__list");
    const trace = document.querySelector(".nav__trace");
    const moveTrace = (link) => {
        if (!link) return (trace.style.opacity = 0);
        const inset = 12; // sit under the text, not the padding
        trace.style.left = `${link.offsetLeft + inset}px`;
        trace.style.width = `${link.offsetWidth - inset * 2}px`;
        trace.style.opacity = 1;
    };
    navList.querySelectorAll("a.nav__link").forEach((a) =>
        a.addEventListener("pointerenter", () => moveTrace(a))
    );
    navList.addEventListener("pointerleave", () => moveTrace(navList.querySelector(".active-link")));

    // Highlight the header link + tab bar item of whichever section is mid-screen
    const navLinks = [...document.querySelectorAll("a.nav__link, .tabbar__link")];
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            navLinks.forEach((a) => a.classList.toggle("active-link", a.hash === `#${e.target.id}`));
            if (!navList.matches(":hover")) moveTrace(navList.querySelector(".active-link"));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

    /*=============== GLITCH ===============*/
    // Hover: button and link labels scramble and decode back
    const originals = new WeakMap();
    document.addEventListener("pointerover", (e) => {
        const el = e.target.closest(".btn, .origin-btn, .more-toggle");
        if (!el || el.contains(e.relatedTarget) || reducedMotion) return;
        textNodes(el).forEach((n) => {
            if (!originals.has(n)) originals.set(n, n.nodeValue);
            decode(n, originals.get(n), 16, 45);
        });
    });

    // Click: a split-second RGB-split jolt
    document.addEventListener("click", (e) => {
        const el = e.target.closest(".btn, .social-links a, .tabbar__link, .card__links a, .minis a, .more-toggle, .origin-btn");
        if (!el || reducedMotion) return;
        el.classList.remove("is-glitching");
        void el.offsetWidth; // restart the animation on rapid clicks
        el.classList.add("is-glitching");
        el.addEventListener("animationend", () => el.classList.remove("is-glitching"), { once: true });
    });

    /*=============== POINTER READOUT ===============*/
    // Live x/y of the mouse, or of a finger on touch screens
    const readout = document.getElementById("cursor-readout");
    const pad = (n) => String(Math.round(n)).padStart(4, "0");
    let frame = 0;
    const track = (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => (readout.textContent = `x:${pad(e.clientX)} y:${pad(e.clientY)}`));
    };
    addEventListener("pointermove", track, { passive: true });
    addEventListener("pointerdown", track, { passive: true });

    /*=============== LOGO ===============*/
    // 4BH1J17H decodes into the real name on hover, and back on leave
    const logo = document.querySelector(".nav__logo");
    const leet = logo.textContent;
    let logoRun = 0;
    const logoTo = async (text) => {
        if (reducedMotion) return (logo.textContent = text);
        const run = ++logoRun; // a newer hover wins over a half-finished one
        for (let f = 1; f <= 14 && run === logoRun; f++) {
            const settled = Math.floor((f / 14) * text.length);
            logo.textContent = text.slice(0, settled) + [...text.slice(settled)].map(randChar).join("");
            await sleep(45);
        }
    };
    logo.addEventListener("pointerenter", () => logoTo(logo.dataset.alt));
    logo.addEventListener("pointerleave", () => logoTo(leet));

    /*=============== ORIGIN STORIES ===============*/
    const story = document.getElementById("story");
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".origin-btn");
        if (!btn) return;
        const tpl = document.getElementById(`story-${btn.dataset.story}`);
        document.getElementById("story-title").textContent = tpl.dataset.title;
        document.getElementById("story-tag").textContent = tpl.dataset.tag;
        const body = document.getElementById("story-body");
        body.replaceChildren(tpl.content.cloneNode(true));
        story.showModal();
        if (reducedMotion) return;
        body.querySelectorAll("p").forEach((p, i) => {
            const node = p.firstChild, text = node.nodeValue;
            node.nodeValue = "";
            setTimeout(() => decode(node, text, 14, 35), i * 220);
        });
    });
    // Close on the x button or a click on the backdrop
    story.addEventListener("click", (e) => {
        if (e.target === story || e.target.closest("[data-close]")) story.close();
    });

    /*=============== MORE DETAILS (phones) ===============*/
    document.querySelectorAll(".more-toggle").forEach((btn) =>
        btn.addEventListener("click", () => {
            const open = btn.closest(".featured").classList.toggle("is-open");
            btn.setAttribute("aria-expanded", open);
            btn.textContent = open ? "--quiet" : "--verbose";
        })
    );

    /*=============== SCROLL REVEAL ===============*/
    const reveal = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-visible");
            reveal.unobserve(e.target);
        });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

    /*=============== CARD GLOW ===============*/
    document.querySelectorAll(".card").forEach((card) =>
        card.addEventListener("pointermove", (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty("--mx", `${e.clientX - r.left}px`);
            card.style.setProperty("--my", `${e.clientY - r.top}px`);
        })
    );

    /*=============== GLITCHED TEXT ===============*/
    glitchCycle(
        document.getElementById("glitched-text"),
        ["Product Engineer", "DevOps Engineer", "Full-Stack Dev", "Extension Builder", "Computernaut", "Alien"]
    );
});

// Scrambles from one word to the next, settling letters left to right
async function glitchCycle(el, words) {
    for (let i = 0; ; i = (i + 1) % words.length) {
        await sleep(2200);
        const next = words[(i + 1) % words.length];

        if (reducedMotion) {
            el.textContent = next;
            continue;
        }

        const frames = 22;
        for (let f = 1; f <= frames; f++) {
            const settled = Math.floor((f / frames) * next.length);
            let noise = "";
            for (let c = settled; c < next.length; c++) noise += next[c] === " " ? " " : randChar();
            el.textContent = next.slice(0, settled);
            if (noise) {
                const span = document.createElement("span");
                span.className = "noise";
                span.textContent = noise;
                el.append(span);
            }
            await sleep(45);
        }
    }
}
