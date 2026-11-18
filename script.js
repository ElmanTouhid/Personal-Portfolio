(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var hasIO = "IntersectionObserver" in window;

    // true = animations replay every time a section scrolls back into view
    var REPLAY = true;

    root.classList.add("js-enabled", "js-ready");

    var hero = document.getElementById("home");
    var h1 = hero && hero.querySelector("h1");

    // =========================================
    // HEADLINE SCRAMBLE (letters flicker, then lock in left to right)
    // =========================================
    var NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz<>/{}[]#$%&*+=";
    var scrambleToken = 0;

    function restoreText() {
        if (!h1) return;
        h1.classList.remove("scrambling");
        h1.querySelectorAll("[data-scramble]").forEach(function (el) {
            if (el.dataset.text) el.textContent = el.dataset.text;
        });
    }

    function buildChars(el) {
        var text = el.dataset.text || (el.dataset.text = el.textContent);
        var chars = [];
        el.textContent = "";
        text.split(/( )/).forEach(function (part) {
            if (part === " ") { el.appendChild(document.createTextNode(" ")); return; }
            var word = document.createElement("span");
            word.style.cssText = "display:inline-block;white-space:nowrap";
            part.split("").forEach(function (ch) {
                var s = document.createElement("span");
                s.className = "scramble-char";
                s.textContent = ch;
                word.appendChild(s);
                chars.push({ s: s, ch: ch, el: el, at: 0, swap: 0, done: false });
            });
            el.appendChild(word);
        });
        chars.forEach(function (c) {          // lock widths so nothing reflows while scrambling
            c.s.style.width = c.s.getBoundingClientRect().width + "px";
            c.s.style.textAlign = "center";
        });
        return chars;
    }

    function runScramble() {
        if (!h1 || reduceMotion) return;
        var token = ++scrambleToken;
        restoreText();

        var lines = h1.querySelectorAll(".hero-line-inner");
        var all = [];
        lines.forEach(function (line, li) {
            var i = 0;
            line.querySelectorAll("[data-scramble]").forEach(function (el) {
                buildChars(el).forEach(function (c) {
                    c.at = 280 + li * 130 + i++ * 50;
                    all.push(c);
                });
            });
        });
        h1.classList.add("scrambling");

        var t0 = performance.now();
        (function tick(now) {
            if (token !== scrambleToken) return;
            var t = now - t0, left = 0;
            all.forEach(function (c) {
                if (c.done) return;
                if (t >= c.at || c.ch === ".") {
                    c.s.textContent = c.ch;
                    c.s.classList.remove("is-noise");
                    c.done = true;
                } else {
                    left++;
                    if (t >= c.swap) {
                        c.s.textContent = NOISE.charAt(Math.floor(Math.random() * NOISE.length));
                        c.s.classList.add("is-noise");
                        c.swap = t + 45;
                    }
                }
            });
            // Finish each word element as soon as its letters are placed
            h1.querySelectorAll("[data-scramble]").forEach(function (el) {
                var pending = all.some(function (c) { return c.el === el && !c.done; });
                if (!pending && el.firstChild && el.firstChild.nodeType === 1 && el.dataset.text) {
                    el.textContent = el.dataset.text;
                    if (el.classList.contains("ideas-word")) {
                        el.classList.remove("glow-once");
                        void el.offsetWidth;
                        el.classList.add("glow-once");
                    }
                }
            });
            if (left > 0) requestAnimationFrame(tick);
            else h1.classList.remove("scrambling");
        })(t0);
    }

    // =========================================
    // HERO ENTRANCE + REPLAY
    // =========================================
    function setHeroReady(on) {
        if (!hero) return;
        if (on && !hero.classList.contains("hero-ready")) {
            hero.classList.add("hero-ready");
            var fonts = document.fonts && document.fonts.ready;
            Promise.race([fonts || Promise.resolve(), new Promise(function (r) { setTimeout(r, 900); })])
                .then(runScramble);
        } else if (!on && hero.classList.contains("hero-ready")) {
            hero.classList.remove("hero-ready");
            scrambleToken++;
            restoreText();
        }
    }

    if (hero) {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { setHeroReady(true); });
        });

        if (REPLAY && !reduceMotion && hasIO) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.intersectionRatio === 0) setHeroReady(false);
                    else if (e.intersectionRatio >= 0.3) setHeroReady(true);
                });
            }, { threshold: [0, 0.3] }).observe(hero);
        }
    }

    // =========================================
    // CURSOR EFFECTS (desktop only): spotlight, particles, portrait tilt
    // =========================================
    if (hero && finePointer && !reduceMotion) {
        var canvas = document.getElementById("hero-canvas");
        var ctx = canvas && canvas.getContext("2d");
        var portrait = hero.querySelector(".portrait-3d");
        var DENSITY = 1 / 13000, MAX_P = 95, LINK = 120, REPEL = 150;
        var W = 0, H = 0, pts = [], mx = -999, my = -999, vis = true, raf = 0;

        hero.classList.add("fx-on");
        if (portrait) portrait.classList.add("is-idle");

        function size() {
            var r = hero.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
            W = r.width; H = r.height;
            canvas.width = W * d; canvas.height = H * d;
            ctx.setTransform(d, 0, 0, d, 0, 0);
            var n = Math.min(MAX_P, Math.round(W * H * DENSITY));
            while (pts.length < n) {
                pts.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
                    bx: (Math.random() - 0.5) * 0.35, by: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.4 + 0.8 });
            }
            pts.length = n;
        }

        function frame() {
            raf = 0;
            if (!vis || document.hidden) return;
            ctx.clearRect(0, 0, W, H);
            var near = [];
            pts.forEach(function (p) {
                p.x += p.bx + p.vx; p.y += p.by + p.vy;
                p.vx *= 0.92; p.vy *= 0.92;
                if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
                var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
                if (d < REPEL && d > 0) {
                    var f = Math.pow(1 - d / REPEL, 2) * 2.2;
                    p.vx += dx / d * f; p.vy += dy / d * f;
                }
                if (d < REPEL * 1.4) near.push({ p: p, d: d });
                ctx.fillStyle = "rgba(249,115,22," + (d < REPEL * 1.4 ? 0.9 : 0.45) + ")";
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
            });
            ctx.lineWidth = 1;
            for (var i = 0; i < near.length; i++) {
                var a = near[i];
                ctx.strokeStyle = "rgba(249,115,22," + (1 - a.d / (REPEL * 1.4)) * 0.55 + ")";
                ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(a.p.x, a.p.y); ctx.stroke();
                for (var j = i + 1; j < near.length; j++) {
                    var b = near[j], dx = a.p.x - b.p.x, dy = a.p.y - b.p.y, dd = Math.sqrt(dx * dx + dy * dy);
                    if (dd < LINK) {
                        ctx.strokeStyle = "rgba(249,115,22," + (1 - dd / LINK) * 0.4 + ")";
                        ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(b.p.x, b.p.y); ctx.stroke();
                    }
                }
            }
            raf = requestAnimationFrame(frame);
        }

        function kick() { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(frame); }
        function clamp(v) { return Math.max(-1, Math.min(1, v)); }

        if (canvas && ctx) {
            size();
            if ("ResizeObserver" in window) new ResizeObserver(size).observe(hero);
            if (hasIO) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; kick(); }).observe(hero);
            document.addEventListener("visibilitychange", kick);
            kick();
        }

        hero.addEventListener("pointermove", function (e) {
            if (e.pointerType !== "mouse") return;
            var r = hero.getBoundingClientRect();
            mx = e.clientX - r.left; my = e.clientY - r.top;
            hero.style.setProperty("--mx", mx + "px");
            hero.style.setProperty("--my", my + "px");
            hero.classList.add("is-hovered");
            if (portrait) {
                var pr = portrait.getBoundingClientRect();
                var nx = clamp((e.clientX - (pr.left + pr.width / 2)) / (pr.width * 1.2));
                var ny = clamp((e.clientY - (pr.top + pr.height / 2)) / (pr.height * 1.2));
                portrait.classList.remove("is-idle");
                portrait.style.setProperty("--ry", nx * 10 + "deg");
                portrait.style.setProperty("--rx", -ny * 8 + "deg");
                portrait.style.setProperty("--gx", -nx * 28 + "px");
                portrait.style.setProperty("--gy", -ny * 28 + "px");
                portrait.style.setProperty("--sx", 50 + nx * 40 + "%");
                portrait.style.setProperty("--sy", 35 + ny * 40 + "%");
            }
        });

        hero.addEventListener("pointerleave", function () {
            mx = my = -999;
            hero.classList.remove("is-hovered");
            if (portrait) {
                ["--rx", "--ry", "--gx", "--gy"].forEach(function (v) { portrait.style.removeProperty(v); });
                portrait.classList.add("is-idle");
            }
        });
    }

    // =========================================
    // SCROLL REVEAL (replays on re-entry)
    // =========================================
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child) { child.setAttribute("data-reveal", ""); });
    });

    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    if (reduceMotion || !hasIO) {
        targets.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
        var revealIO = new IntersectionObserver(function (entries, obs) {
            if (REPLAY) {
                entries.forEach(function (e) { if (e.intersectionRatio === 0) e.target.classList.remove("is-visible"); });
            }
            entries.filter(function (e) {
                return e.isIntersecting && e.intersectionRatio >= 0.15 && !e.target.classList.contains("is-visible");
            }).sort(function (a, b) {
                return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
            }).forEach(function (e, i) {
                e.target.style.setProperty("--reveal-delay", Math.min(i, 5) * 90 + "ms");
                e.target.classList.add("is-visible");
                if (!REPLAY) obs.unobserve(e.target);
            });
        }, { threshold: [0, 0.15], rootMargin: "0px 0px -8% 0px" });
        targets.forEach(function (el) { revealIO.observe(el); });
    }

    // =========================================
    // GLASS NAV: sliding pill, active section, scrolled state
    // =========================================
    var header = document.querySelector(".glass-header");
    var linksBox = document.querySelector(".glass-links");
    var pill = linksBox && linksBox.querySelector(".glass-pill");
    var navLinks = document.querySelectorAll(".nav-link");

    function movePill(a) {
        if (!pill) return;
        if (!a) { pill.style.opacity = 0; return; }
        pill.style.width = a.offsetWidth + "px";
        pill.style.transform = "translateX(" + a.offsetLeft + "px)";
        pill.style.opacity = 1;
    }
    function activeLink() { return linksBox && linksBox.querySelector('[aria-current="true"]'); }

    if (linksBox) {
        linksBox.addEventListener("pointerover", function (e) {
            var a = e.target.closest(".nav-link"); if (a) movePill(a);
        });
        linksBox.addEventListener("pointerleave", function () { movePill(activeLink()); });
        window.addEventListener("resize", function () { movePill(activeLink()); });
    }

    function setActive(id) {
        navLinks.forEach(function (l) {
            if (l.getAttribute("href") === "#" + id) l.setAttribute("aria-current", "true");
            else l.removeAttribute("aria-current");
        });
        movePill(activeLink());
    }

    if (hasIO) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
        }, { rootMargin: "-45% 0px -50% 0px" });
        ["home", "about", "skills", "projects", "contact"].forEach(function (id) {
            var s = document.getElementById(id); if (s) spy.observe(s);
        });
    }

    if (header) {
        var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 20); };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    // =========================================
    // ABOUT SECTION: text animations + swipeable card stack
    // =========================================
    var about = document.getElementById("about");

    if (about) {
        var rand = function (a, b) { return a + Math.random() * (b - a); };

        // Wrap every word of an element in <span class="cls">, keeping nested spans (e.g. the orange part)
        var splitWords = function (root, cls) {
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            var nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(function (tn) {
                var frag = document.createDocumentFragment();
                tn.textContent.split(/(\s+)/).forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
                    var s = document.createElement("span");
                    s.className = cls;
                    s.textContent = part;
                    frag.appendChild(s);
                });
                tn.parentNode.replaceChild(frag, tn);
            });
        };

        // "Get To Know Me" -> one span per letter (screen readers get the plain text)
        var eyebrow = about.querySelector(".about-eyebrow");
        if (eyebrow) {
            var eyeText = eyebrow.textContent.trim();
            eyebrow.textContent = "";
            var sr = document.createElement("span");
            sr.className = "about-sr";
            sr.textContent = eyeText;
            var vis = document.createElement("span");
            vis.setAttribute("aria-hidden", "true");
            eyeText.split(" ").forEach(function (word, wi) {
                if (wi) vis.appendChild(document.createTextNode(" "));
                var w = document.createElement("span");
                w.style.cssText = "display:inline-block;white-space:nowrap";
                word.split("").forEach(function (ch) {
                    var l = document.createElement("span");
                    l.className = "el";
                    l.textContent = ch;
                    w.appendChild(l);
                });
                vis.appendChild(w);
            });
            eyebrow.appendChild(sr);
            eyebrow.appendChild(vis);
        }

        var scatter = about.querySelector(".about-scatter");
        if (scatter) splitWords(scatter, "sw");

        // Fresh random positions each time the section comes into view
        var prepare = function (el) {
            var kind = el.getAttribute("data-about-anim");
            if (kind === "eyebrow") {
                el.querySelectorAll(".el").forEach(function (l) {
                    l.style.setProperty("--ed", Math.round(rand(0, 480)) + "ms");
                });
            } else if (kind === "scatter") {
                el.querySelectorAll(".sw").forEach(function (w) {
                    var ang = rand(0, Math.PI * 2), dist = rand(140, 280);
                    w.style.setProperty("--sx", Math.round(Math.cos(ang) * dist) + "px");
                    w.style.setProperty("--sy", Math.round(Math.sin(ang) * dist * 0.6) + "px");
                    w.style.setProperty("--sr", Math.round(rand(-40, 40)) + "deg");
                    w.style.setProperty("--sd", Math.round(rand(0, 220)) + "ms");
                });
            } else if (kind === "deck") {
                var dc = el.querySelectorAll(".deck-card");
                dc.forEach(function (c) {
                    var pos = parseFloat(c.style.getPropertyValue("--pos")) || 0;
                    c.style.setProperty("--deal", dc.length - 1 - pos);   // back cards land first
                });
            }
        };

        var aboutAnims = about.querySelectorAll("[data-about-anim]");
        if (reduceMotion || !hasIO) {
            aboutAnims.forEach(function (el) { el.classList.add("anim-in"); });
        } else {
            var aboutIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    var el = e.target;
                    if (e.intersectionRatio === 0) {
                        if (REPLAY) el.classList.remove("anim-in");
                    } else if (e.intersectionRatio >= 0.2 && !el.classList.contains("anim-in")) {
                        prepare(el);
                        el.classList.add("anim-in");
                    }
                });
            }, { threshold: [0, 0.2] });
            aboutAnims.forEach(function (el) { aboutIO.observe(el); });
        }

        // Liquid glass: light follows the cursor
        var glass = about.querySelector(".about-glass");
        if (glass && finePointer && !reduceMotion) {
            glass.addEventListener("pointermove", function (e) {
                var r = glass.getBoundingClientRect();
                glass.style.setProperty("--gx", (e.clientX - r.left) + "px");
                glass.style.setProperty("--gy", (e.clientY - r.top) + "px");
            });
        }

        // ----- Card stack -----
        var deck = document.getElementById("about-deck");
        if (deck) {
            var cards = Array.prototype.slice.call(deck.querySelectorAll(".deck-card"));
            var order = cards.slice();
            var busy = false;
            var FLY_MS = reduceMotion ? 0 : 430;
            var THRESHOLD = 80;
            var current = about.querySelector(".deck-current");
            var hint = about.querySelector(".deck-hint");
            var pad = function (n) { return (n < 10 ? "0" : "") + n; };

            var layout = function (progress) {
                var p = progress || 0;
                order.forEach(function (c, i) {
                    c.style.setProperty("--pos", i === 0 ? 0 : Math.max(0, i - p));
                    c.style.zIndex = String(order.length - i);
                    c.classList.toggle("is-top", i === 0);
                    c.setAttribute("aria-hidden", i === 0 ? "false" : "true");
                });
                if (current) current.textContent = pad(cards.indexOf(order[0]) + 1);
            };

            var used = function () { if (hint) hint.classList.add("is-used"); };

            var setDrag = function (c, dx) {
                c.style.setProperty("--dx", dx + "px");
                c.style.setProperty("--rot", (dx * 0.06).toFixed(2) + "deg");
            };

            // Top card flies off to the left, then tucks in at the back
            var next = function () {
                if (busy) return;
                busy = true;
                used();
                var top = order[0];
                order.push(order.shift());
                layout();
                top.style.setProperty("--pos", 0);
                top.style.zIndex = String(order.length + 1);
                top.classList.add("deck-fly");
                top.style.setProperty("--dx", -(top.offsetWidth * 1.25) + "px");
                top.style.setProperty("--rot", "-14deg");
                setTimeout(function () {
                    top.classList.remove("deck-fly");
                    setDrag(top, 0);
                    layout();
                    busy = false;
                }, FLY_MS);
            };

            // Last card comes back in from the left onto the top
            var prev = function () {
                if (busy) return;
                busy = true;
                used();
                var card = order.pop();
                order.unshift(card);
                card.classList.add("no-anim", "deck-fly");
                card.style.zIndex = String(order.length + 1);
                card.style.setProperty("--pos", 0);
                card.style.setProperty("--dx", -(card.offsetWidth * 1.25) + "px");
                card.style.setProperty("--rot", "-14deg");
                void card.offsetWidth;                       // commit the off-screen start
                card.classList.remove("no-anim", "deck-fly");
                setDrag(card, 0);
                layout();
                setTimeout(function () { busy = false; }, FLY_MS);
            };

            layout();

            // Drag with the mouse / swipe with a finger
            var dragging = false, startX = 0, dx = 0;

            deck.addEventListener("pointerdown", function (e) {
                if (busy || e.button > 0 || !order[0].contains(e.target)) return;
                dragging = true;
                startX = e.clientX;
                dx = 0;
                deck.classList.add("is-dragging");
                try { deck.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            });

            deck.addEventListener("pointermove", function (e) {
                if (!dragging) return;
                dx = e.clientX - startX;
                setDrag(order[0], dx);
                layout(dx < 0 ? Math.min(1, -dx / 200) : 0);    // next card rises as you pull
            });

            var endDrag = function () {
                if (!dragging) return;
                dragging = false;
                deck.classList.remove("is-dragging");
                if (dx <= -THRESHOLD) {
                    next();
                } else {
                    setDrag(order[0], 0);
                    layout();
                    if (dx >= THRESHOLD) prev();
                }
                dx = 0;
            };
            deck.addEventListener("pointerup", endDrag);
            deck.addEventListener("pointercancel", endDrag);
            deck.addEventListener("lostpointercapture", endDrag);

            // Two-finger trackpad swipe sideways
            var wheelAcc = 0, wheelLock = 0;
            deck.addEventListener("wheel", function (e) {
                if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
                e.preventDefault();
                var now = Date.now();
                if (now < wheelLock) return;
                wheelAcc += e.deltaX;
                if (Math.abs(wheelAcc) > 60) {
                    if (wheelAcc > 0) next(); else prev();
                    wheelAcc = 0;
                    wheelLock = now + 650;
                }
            }, { passive: false });

            // Keyboard + buttons
            deck.addEventListener("keydown", function (e) {
                if (e.key === "ArrowRight") { e.preventDefault(); next(); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
            });
            about.querySelectorAll("[data-deck]").forEach(function (b) {
                b.addEventListener("click", function () {
                    if (b.getAttribute("data-deck") === "next") next(); else prev();
                });
            });
        }
    }

    // =========================================
    // MOBILE NAVIGATION
    // =========================================
    var menuBtn = document.getElementById("menu-btn");
    var mobileMenu = document.getElementById("mobile-menu");

    if (menuBtn && mobileMenu) {
        var setMenu = function (open) {
            mobileMenu.classList.toggle("hidden", !open);
            mobileMenu.classList.toggle("flex", open);
            menuBtn.innerHTML = open ? "✕" : "☰";
            menuBtn.setAttribute("aria-expanded", String(open));
        };
        menuBtn.addEventListener("click", function () { setMenu(mobileMenu.classList.contains("hidden")); });
        mobileMenu.querySelectorAll("a").forEach(function (l) { l.addEventListener("click", function () { setMenu(false); }); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !mobileMenu.classList.contains("hidden")) { setMenu(false); menuBtn.focus(); }
        });
    }
})();