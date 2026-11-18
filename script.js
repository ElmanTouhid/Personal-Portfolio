(function () {
    "use strict";

    // Animation speed for every section: 1 = original, 1.5 = 50% slower.
    // (The CSS animation timings in style.css are already scaled by the same amount.)
    var SLOW = 1.5;

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
    // HERO ENTRANCE + REPLAY
    // =========================================
    function setHeroReady(on) {
        if (!hero) return;
        if (on && !hero.classList.contains("hero-ready")) {
            hero.classList.add("hero-ready");      // headline words blur into focus (CSS)
        } else if (!on && hero.classList.contains("hero-ready")) {
            hero.classList.remove("hero-ready");
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
                e.target.style.setProperty("--reveal-delay", Math.round(Math.min(i, 5) * 90 * SLOW) + "ms");
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

    if (about) (function () {
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
                    l.style.setProperty("--ed", Math.round(rand(0, 480) * SLOW) + "ms");
                });
            } else if (kind === "scatter") {
                el.querySelectorAll(".sw").forEach(function (w) {
                    var ang = rand(0, Math.PI * 2), dist = rand(140, 280);
                    w.style.setProperty("--sx", Math.round(Math.cos(ang) * dist) + "px");
                    w.style.setProperty("--sy", Math.round(Math.sin(ang) * dist * 0.6) + "px");
                    w.style.setProperty("--sr", Math.round(rand(-40, 40)) + "deg");
                    w.style.setProperty("--sd", Math.round(rand(0, 220) * SLOW) + "ms");
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

        // ----- Binary background: magnetic digits, hold + swipe to flip -----
        var bits = document.getElementById("about-bits");
        var bctx = bits && bits.getContext("2d");
        if (bits && bctx) {
            var interactive = finePointer && !reduceMotion;
            var CELL = 32;                 // grid spacing (px)
            var MAG_R = 130;               // magnetic radius
            var MAG_PULL = 12;             // max pull toward the cursor (px)
            var FLIP_R = 20;               // swipe radius that flips a digit
            var BASE_A = 0.055;            // resting opacity: melts into the black
            var NEAR_A = 0.08;             // extra opacity right next to the cursor
            var FONT = "600 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
            var bw = 0, bh = 0, digits = [], bRaf = 0, bVisible = false;
            var cx = -9999, cy = -9999, lx = -9999, ly = -9999, inside = false;
            var swiping = false, stroke = 0;

            var buildBits = function () {
                var r = about.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
                if (Math.round(r.width) === bw && Math.abs(r.height - bh) < 40 && digits.length) {
                    bh = r.height;
                    bits.height = bh * d;
                    bctx.setTransform(d, 0, 0, d, 0, 0);
                    return;
                }
                bw = Math.round(r.width); bh = r.height;
                bits.width = bw * d; bits.height = bh * d;
                bctx.setTransform(d, 0, 0, d, 0, 0);
                digits = [];
                for (var y = CELL / 2; y < bh; y += CELL) {
                    for (var x = CELL / 2; x < bw; x += CELL) {
                        digits.push({
                            hx: x + rand(-5, 5), hy: y + rand(-5, 5),
                            ox: 0, oy: 0,
                            v: Math.random() < 0.5 ? 0 : 1,
                            glow: 0, flash: 0, stroke: -1
                        });
                    }
                }
            };

            // distance from a digit to the swipe segment since the last move (catches fast swipes)
            var segDist = function (px, py, ax, ay, bx2, by2) {
                var vx = bx2 - ax, vy = by2 - ay, len = vx * vx + vy * vy;
                var t = len ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len)) : 0;
                var qx = ax + t * vx - px, qy = ay + t * vy - py;
                return Math.sqrt(qx * qx + qy * qy);
            };

            var drawBits = function () {
                bRaf = 0;
                bctx.clearRect(0, 0, bw, bh);
                bctx.font = FONT;
                bctx.textAlign = "center";
                bctx.textBaseline = "middle";
                var busyAgain = false;

                for (var i = 0; i < digits.length; i++) {
                    var g = digits[i];
                    var tx = 0, ty = 0, near = 0;

                    if (interactive && inside) {
                        var dx = cx - g.hx, dy = cy - g.hy, dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < MAG_R && dist > 0.01) {
                            near = 1 - dist / MAG_R;
                            var pull = near * near * MAG_PULL;
                            tx = dx / dist * pull;
                            ty = dy / dist * pull;
                        }
                        if (swiping && g.stroke !== stroke && segDist(g.hx + g.ox, g.hy + g.oy, lx, ly, cx, cy) < FLIP_R) {
                            g.v = 1 - g.v;          // stays flipped until swiped again
                            g.stroke = stroke;
                            g.flash = 1;
                        }
                    }

                    g.ox += (tx - g.ox) * 0.14;
                    g.oy += (ty - g.oy) * 0.14;
                    g.glow += (near - g.glow) * 0.15;
                    if (g.flash > 0.01) g.flash *= 0.93; else g.flash = 0;

                    if (Math.abs(tx - g.ox) > 0.05 || Math.abs(ty - g.oy) > 0.05 || Math.abs(near - g.glow) > 0.01 || g.flash) busyAgain = true;

                    var a = BASE_A + g.glow * NEAR_A + g.flash * 0.12;
                    if (g.flash) {
                        // faint warm tint that fades back to grey
                        var f = g.flash;
                        bctx.fillStyle = "rgba(" + Math.round(255 - f * 25) + "," + Math.round(255 - f * 95) + "," + Math.round(255 - f * 150) + "," + a.toFixed(3) + ")";
                    } else {
                        bctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
                    }
                    bctx.fillText(g.v ? "1" : "0", g.hx + g.ox, g.hy + g.oy);
                }

                lx = cx; ly = cy;
                if (interactive && bVisible && !document.hidden && (inside || busyAgain)) bRaf = requestAnimationFrame(drawBits);
            };

            var wakeBits = function () { if (!bRaf) bRaf = requestAnimationFrame(drawBits); };

            buildBits();
            drawBits();
            if ("ResizeObserver" in window) new ResizeObserver(function () { buildBits(); wakeBits(); }).observe(about);
            if (hasIO) {
                new IntersectionObserver(function (en) { bVisible = en[0].isIntersecting; if (bVisible) wakeBits(); }).observe(about);
            } else {
                bVisible = true;
            }

            if (interactive) {
                var toLocal = function (e) {
                    var r = bits.getBoundingClientRect();
                    cx = e.clientX - r.left;
                    cy = e.clientY - r.top;
                };

                about.addEventListener("pointermove", function (e) {
                    if (e.pointerType !== "mouse") return;
                    if (!inside) { toLocal(e); lx = cx; ly = cy; }
                    inside = true;
                    toLocal(e);
                    wakeBits();
                });
                about.addEventListener("pointerleave", function () {
                    inside = false;
                    cx = cy = lx = ly = -9999;
                    wakeBits();
                });

                // Hold the left button anywhere in the background (not on the cards, buttons or links) and swipe
                about.addEventListener("mousedown", function (e) {
                    if (e.button !== 0 || e.target.closest(".about-deck-wrap, a, button, input, textarea")) return;
                    e.preventDefault();                       // no text selection while swiping
                    swiping = true;
                    stroke++;
                    toLocal(e); lx = cx; ly = cy;
                    inside = true;
                    about.classList.add("is-swiping");
                    wakeBits();
                });
                window.addEventListener("mouseup", function () {
                    if (!swiping) return;
                    swiping = false;
                    about.classList.remove("is-swiping");
                });
            }
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
    })();

    // =========================================
    // SKILLS SECTION: letter / word entrances + Netflix-style row
    // =========================================
    var skills = document.getElementById("skills");

    if (skills) (function () {
        // "What I'm Exploring" -> letters that arrive from the left, last letter first
        var sEye = skills.querySelector(".skills-eyebrow");
        if (sEye) {
            var sText = sEye.textContent.trim();
            sEye.textContent = "";
            var sSr = document.createElement("span");
            sSr.className = "skills-sr";
            sSr.textContent = sText;
            var sVis = document.createElement("span");
            sVis.setAttribute("aria-hidden", "true");
            var letters = [];
            sText.split(" ").forEach(function (word, wi) {
                if (wi) sVis.appendChild(document.createTextNode(" "));
                var w = document.createElement("span");
                w.style.cssText = "display:inline-block;white-space:nowrap";
                word.split("").forEach(function (ch) {
                    var l = document.createElement("span");
                    l.className = "sl";
                    l.textContent = ch;
                    w.appendChild(l);
                    letters.push(l);
                });
                sVis.appendChild(w);
            });
            // EXPLORING builds first (G, N, I ... E), then I'M (M, ', I), then WHAT (T, A, H, W)
            letters.reverse().forEach(function (l, k) { l.style.setProperty("--k", k); });
            sEye.appendChild(sSr);
            sEye.appendChild(sVis);
        }

        var skillsTrackEl = document.getElementById("skills-track");
        if (skillsTrackEl) Array.prototype.forEach.call(skillsTrackEl.children, function (c, i) { c.style.setProperty("--c", Math.min(i, 3)); });

        var skillAnims = skills.querySelectorAll("[data-skills-anim]");
        if (reduceMotion || !hasIO) {
            skillAnims.forEach(function (el) { el.classList.add("anim-in"); });
        } else {
            var skillsIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.intersectionRatio === 0) {
                        if (REPLAY) e.target.classList.remove("anim-in");
                    } else if (e.intersectionRatio >= 0.2) {
                        e.target.classList.add("anim-in");
                    }
                });
            }, { threshold: [0, 0.2] });
            skillAnims.forEach(function (el) { skillsIO.observe(el); });
        }

        // ----- Aurora: glows lean toward the cursor (desktop) -----
        var aurora = skills.querySelector(".skills-aurora");
        if (aurora && finePointer && !reduceMotion) {
            var ax = 0, ay = 0, atx = 0, aty = 0, aRaf = 0;
            var auroraStep = function () {
                ax += (atx - ax) * 0.05;
                ay += (aty - ay) * 0.05;
                aurora.style.setProperty("--fx", ax.toFixed(1) + "px");
                aurora.style.setProperty("--fy", ay.toFixed(1) + "px");
                if (Math.abs(atx - ax) > 0.3 || Math.abs(aty - ay) > 0.3) aRaf = requestAnimationFrame(auroraStep);
                else aRaf = 0;
            };
            var auroraKick = function () { if (!aRaf) aRaf = requestAnimationFrame(auroraStep); };

            skills.addEventListener("pointermove", function (e) {
                if (e.pointerType !== "mouse") return;
                var r = skills.getBoundingClientRect();
                // offset from the section centre, scaled down so the glow only leans, never jumps
                atx = Math.max(-220, Math.min(220, (e.clientX - r.left - r.width / 2) * 0.3));
                aty = Math.max(-160, Math.min(160, (e.clientY - r.top - r.height / 2) * 0.3));
                skills.classList.add("aurora-active");
                auroraKick();
            });
            skills.addEventListener("pointerleave", function () {
                atx = aty = 0;
                skills.classList.remove("aurora-active");
                auroraKick();
            });
        }

        // ----- Sideways row -----
        var track = document.getElementById("skills-track");
        var fill = skills.querySelector(".skills-progress-fill");

        if (track) {
            var target = 0, anim = 0, dragging2 = false, moved = false, dStartX = 0, dStartScroll = 0;
            var maxScroll = function () { return Math.max(0, track.scrollWidth - track.clientWidth); };
            var clampS = function (v) { return Math.max(0, Math.min(maxScroll(), v)); };

            var updateRow = function () {
                var max = maxScroll(), x = track.scrollLeft;
                track.classList.toggle("can-left", x > 4);
                track.classList.toggle("can-right", x < max - 4);
                if (fill) {
                    var ratio = track.clientWidth / track.scrollWidth;      // share of the row on screen
                    fill.style.width = Math.max(12, ratio * 100) + "%";
                    var p = max ? x / max : 0;
                    fill.style.setProperty("--p", (p * (1 / Math.max(ratio, 0.12) - 1) * 100) + "%");
                }
            };

            var glide = function () {
                var cur = track.scrollLeft, diff = target - cur;
                if (Math.abs(diff) < 0.6) { track.scrollLeft = target; anim = 0; updateRow(); return; }
                track.scrollLeft = cur + diff * 0.16;
                anim = requestAnimationFrame(glide);
            };
            var glideTo = function (v) {
                target = clampS(v);
                if (reduceMotion) { track.scrollLeft = target; updateRow(); return; }
                if (!anim) anim = requestAnimationFrame(glide);
            };

            // Mouse wheel: vertical scrolling over the row moves the cards sideways.
            // At either end the page scrolls normally again.
            track.addEventListener("wheel", function (e) {
                var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (e.deltaMode === 1) d *= 40;
                if (!d) return;
                if (!anim) target = track.scrollLeft;
                var max = maxScroll();
                if ((d < 0 && target <= 0.5) || (d > 0 && target >= max - 0.5)) return;
                e.preventDefault();
                glideTo(target + d * 1.1);
            }, { passive: false });

            // Drag with the mouse
            track.addEventListener("pointerdown", function (e) {
                if (e.pointerType !== "mouse" || e.button !== 0) return;
                dragging2 = true; moved = false;
                dStartX = e.clientX; dStartScroll = track.scrollLeft;
                if (anim) { cancelAnimationFrame(anim); anim = 0; }
            });
            window.addEventListener("pointermove", function (e) {
                if (!dragging2) return;
                var dx = e.clientX - dStartX;
                if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add("is-dragging"); }
                if (moved) { track.scrollLeft = dStartScroll - dx; target = track.scrollLeft; }
            });
            window.addEventListener("pointerup", function () {
                if (!dragging2) return;
                dragging2 = false;
                track.classList.remove("is-dragging");
                if (!moved) return;
                // settle on the nearest card
                var best = 0, bestD = Infinity;
                Array.prototype.forEach.call(track.children, function (c) {
                    var dd = Math.abs(c.offsetLeft - track.scrollLeft);
                    if (dd < bestD) { bestD = dd; best = c.offsetLeft; }
                });
                glideTo(best);
            });
            track.addEventListener("click", function (e) {
                if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
            }, true);
            track.addEventListener("dragstart", function (e) { e.preventDefault(); });

            // Keyboard
            track.addEventListener("keydown", function (e) {
                var step = track.children[1] ? track.children[1].offsetLeft - track.children[0].offsetLeft : 300;
                if (e.key === "ArrowRight") { e.preventDefault(); glideTo((anim ? target : track.scrollLeft) + step); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); glideTo((anim ? target : track.scrollLeft) - step); }
            });

            track.addEventListener("scroll", function () {
                if (!anim && !dragging2) target = track.scrollLeft;
                updateRow();
            }, { passive: true });
            window.addEventListener("resize", updateRow);
            updateRow();
        }
    })();

    // =========================================
    // PROJECTS SECTION: header entrances, bent title, 3D ring carousel
    // =========================================
    var projects = document.getElementById("projects");

    if (projects) (function () {
        // ----- Title: split into letters, then bend the two ends back into the screen -----
        var pTitle = projects.querySelector(".proj-title");
        var pLetters = [];
        if (pTitle) {
            var pWalker = document.createTreeWalker(pTitle, NodeFilter.SHOW_TEXT, null);
            var pNodes = [];
            while (pWalker.nextNode()) pNodes.push(pWalker.currentNode);
            pNodes.forEach(function (tn) {
                var frag = document.createDocumentFragment();
                tn.textContent.split(/(\s+)/).forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
                    var w = document.createElement("span");
                    w.className = "pw";
                    part.split("").forEach(function (ch) {
                        var l = document.createElement("span");
                        l.className = "pl";
                        l.textContent = ch;
                        w.appendChild(l);
                        pLetters.push(l);
                    });
                    frag.appendChild(w);
                });
                tn.parentNode.replaceChild(frag, tn);
            });
        }

        var bendTitle = function () {
            if (!pLetters.length) return;
            var small = window.innerWidth < 640;
            var DEPTH = small ? 22 : 46, TURN = small ? 9 : 18, FLAT = 0.35;
            pLetters.forEach(function (l) { l.style.setProperty("--bz", "0px"); l.style.setProperty("--by", "0deg"); });
            // group letters by line, so each line bends on its own
            var lines = {};
            pLetters.forEach(function (l) {
                var key = Math.round(l.offsetTop / 10);
                (lines[key] = lines[key] || []).push(l);
            });
            Object.keys(lines).forEach(function (k) {
                var row = lines[k];
                var left = Infinity, right = -Infinity;
                row.forEach(function (l) {
                    left = Math.min(left, l.offsetLeft);
                    right = Math.max(right, l.offsetLeft + l.offsetWidth);
                });
                var mid = (left + right) / 2, half = Math.max(1, (right - left) / 2);
                row.forEach(function (l) {
                    var t = (l.offsetLeft + l.offsetWidth / 2 - mid) / half;     // -1 (left end) .. 1 (right end)
                    var e = Math.max(0, Math.abs(t) - FLAT) / (1 - FLAT);         // 0 in the middle, 1 at the ends
                    l.style.setProperty("--bz", (-DEPTH * e * e).toFixed(1) + "px");
                    l.style.setProperty("--by", ((t < 0 ? -1 : 1) * TURN * e).toFixed(1) + "deg");
                });
            });
        };
        bendTitle();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(bendTitle);
        window.addEventListener("resize", bendTitle);

        // ----- 3D ring -----
        var stage = document.getElementById("proj-stage");
        var ring = document.getElementById("proj-ring");
        var pSlots = ring ? Array.prototype.slice.call(ring.querySelectorAll(".proj-slot")) : [];
        var dotsBox = projects.querySelector(".proj-dots");
        var spinIn = function () {};

        if (stage && ring && pSlots.length) {
            var COUNT = pSlots.length;
            var ARC = 40;                  // degrees between neighbouring cards on the ring
            var PX_PER_CARD = 320;         // drag distance that turns one card
            var pos = 0, target = 0, pRaf = 0, ease = 0.12;   // pos/target in "cards"
            var pDragging = false, pMoved = false, pStartX = 0, pStartAngle = 0, lastX = 0, lastT = 0, vel = 0;
            var dots = [];

            var measure = function () {
                stage.classList.add("measuring");
                var maxH = 0;
                pSlots.forEach(function (sl) {
                    sl.style.height = "auto";
                    sl.firstElementChild.style.height = "auto";
                });
                var cardW = pSlots[0].offsetWidth;
                pSlots.forEach(function (sl) { maxH = Math.max(maxH, sl.firstElementChild.offsetHeight); });
                pSlots.forEach(function (sl) {
                    sl.style.height = "";
                    sl.firstElementChild.style.height = "";
                });
                stage.classList.remove("measuring");
                var radius = cardW * (window.innerWidth < 640 ? 1.05 : 1.0);
                stage.style.setProperty("--card-h", Math.ceil(maxH) + "px");
                stage.style.setProperty("--r", Math.round(radius) + "px");
            };

            var wrapIdx = function (k) { return ((k % COUNT) + COUNT) % COUNT; };
            var current = function () { return wrapIdx(Math.round(target)); };
            // where card i sits relative to the front, wrapped so the ring loops forever
            var relPos = function (i) {
                var r = (i - pos) % COUNT;
                if (r > COUNT / 2) r -= COUNT;
                if (r < -COUNT / 2) r += COUNT;
                return r;
            };

            var render = function () {
                // background lettering drifts gently against the turn (bounded, loops smoothly)
                projects.style.setProperty("--drift", (-Math.sin(pos * 2 * Math.PI / COUNT) * 50).toFixed(1) + "px");
                var front = wrapIdx(Math.round(pos));
                pSlots.forEach(function (sl, i) {
                    var r = relPos(i), a = Math.abs(r);
                    sl.style.setProperty("--slot-a", (r * ARC).toFixed(2) + "deg");
                    sl.style.setProperty("--lit", (1 - Math.min(a / 2, 1) * 0.6).toFixed(3));
                    sl.style.setProperty("--vis", Math.max(0, Math.min(1, 2.2 - a)).toFixed(3));
                    sl.style.zIndex = String(10 - Math.round(a * 2));
                    var isFront = i === front;
                    if (sl.classList.contains("is-front") !== isFront) {
                        sl.classList.toggle("is-front", isFront);
                        sl.setAttribute("aria-hidden", isFront ? "false" : "true");
                        sl.querySelectorAll("a").forEach(function (a) { a.tabIndex = isFront ? 0 : -1; });
                    }
                });
                var cur = current();
                dots.forEach(function (d, i) { d.setAttribute("aria-selected", i === cur ? "true" : "false"); });
            };

            var loop = function () {
                pRaf = 0;
                if (!pDragging) pos += (target - pos) * ease;
                if (Math.abs(target - pos) < 0.002 && !pDragging) { pos = target; ease = 0.12; }
                render();
                if (pDragging || pos !== target) pRaf = requestAnimationFrame(loop);
            };
            var kickRing = function () {
                if (reduceMotion && !pDragging) { pos = target; render(); return; }
                if (!pRaf) pRaf = requestAnimationFrame(loop);
            };

            var goTo = function (k) {
                var diff = ((k - current()) % COUNT + COUNT) % COUNT;
                if (diff > COUNT / 2) diff -= COUNT;
                target += diff;
                kickRing();
            };
            var nextP = function () { target += 1; kickRing(); };
            var prevP = function () { target -= 1; kickRing(); };

            // dots, one per project (labelled with the project name)
            if (dotsBox) {
                pSlots.forEach(function (sl, i) {
                    var h = sl.querySelector("h3");
                    var b = document.createElement("button");
                    b.type = "button";
                    b.className = "proj-dot";
                    b.setAttribute("role", "tab");
                    b.setAttribute("aria-label", h ? h.textContent.trim() : "Project " + (i + 1));
                    b.addEventListener("click", function () { goTo(i); });
                    dotsBox.appendChild(b);
                    dots.push(b);
                });
            }
            projects.querySelectorAll("[data-proj]").forEach(function (b) {
                b.addEventListener("click", function () {
                    if (b.getAttribute("data-proj") === "next") nextP(); else prevP();
                });
            });

            // drag with the mouse / swipe with a finger
            stage.addEventListener("pointerdown", function (e) {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                pDragging = true; pMoved = false;
                pStartX = lastX = e.clientX; lastT = performance.now(); vel = 0;
                pStartAngle = pos;
                kickRing();
            });
            window.addEventListener("pointermove", function (e) {
                if (!pDragging) return;
                var dx = e.clientX - pStartX;
                if (!pMoved && Math.abs(dx) > 6) { pMoved = true; stage.classList.add("is-dragging"); }
                if (!pMoved) return;
                var now = performance.now();
                vel = (e.clientX - lastX) / Math.max(1, now - lastT);   // px per ms
                lastX = e.clientX; lastT = now;
                pos = pStartAngle - dx / PX_PER_CARD;     // drag left -> next project
                target = pos;
            });
            var endPDrag = function () {
                if (!pDragging) return;
                pDragging = false;
                stage.classList.remove("is-dragging");
                if (pMoved) {
                    var flung = pos - vel * 160 / PX_PER_CARD;      // a quick flick carries on a little
                    target = Math.round(flung);
                }
                kickRing();
            };
            window.addEventListener("pointerup", endPDrag);
            window.addEventListener("pointercancel", endPDrag);

            // a drag is not a click; clicking a side card turns the ring to it
            stage.addEventListener("click", function (e) {
                if (pMoved) { e.preventDefault(); e.stopPropagation(); pMoved = false; return; }
                var sl = e.target.closest(".proj-slot");
                if (sl && !sl.classList.contains("is-front")) {
                    e.preventDefault();
                    goTo(pSlots.indexOf(sl));
                }
            }, true);
            stage.addEventListener("dragstart", function (e) { e.preventDefault(); });

            // mouse wheel / trackpad: one project per scroll gesture
            var pWheelAcc = 0, pWheelLock = 0;
            stage.addEventListener("wheel", function (e) {
                var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (!d) return;
                e.preventDefault();
                var now = Date.now();
                if (now < pWheelLock) return;
                pWheelAcc += d;
                if (Math.abs(pWheelAcc) > 30) {
                    if (pWheelAcc > 0) nextP(); else prevP();
                    pWheelAcc = 0;
                    pWheelLock = now + 420;
                }
            }, { passive: false });

            stage.addEventListener("keydown", function (e) {
                if (e.key === "ArrowRight") { e.preventDefault(); nextP(); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); prevP(); }
            });

            measure();
            render();
            if ("ResizeObserver" in window) new ResizeObserver(function () { measure(); }).observe(stage);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

            // when the section appears the ring spins into place
            spinIn = function () {
                if (reduceMotion) return;
                pos = target - 2.5;
                ease = 0.055 / SLOW;
                kickRing();
            };
        }

        // ----- entrances (replay on re-entry, like the other sections) -----
        var projAnims = projects.querySelectorAll("[data-proj-anim]");
        if (reduceMotion || !hasIO) {
            projAnims.forEach(function (el) { el.classList.add("anim-in"); });
        } else {
            var projIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    var el = e.target;
                    if (e.intersectionRatio === 0) {
                        if (REPLAY) el.classList.remove("anim-in");
                    } else if (e.intersectionRatio >= 0.2 && !el.classList.contains("anim-in")) {
                        el.classList.add("anim-in");
                        if (el.getAttribute("data-proj-anim") === "ring") spinIn();
                    }
                });
            }, { threshold: [0, 0.2] });
            projAnims.forEach(function (el) { projIO.observe(el); });
        }
    })();

    // =========================================
    // CONTACT SECTION: word entrances + glass card light
    // =========================================
    var contact = document.getElementById("contact");

    if (contact) (function () {
        var cAnims = contact.querySelectorAll("[data-contact-anim]");
        if (reduceMotion || !hasIO) {
            cAnims.forEach(function (el) { el.classList.add("anim-in"); });
        } else {
            var cIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.intersectionRatio === 0) {
                        if (REPLAY) e.target.classList.remove("anim-in");
                    } else if (e.intersectionRatio >= 0.2) {
                        e.target.classList.add("anim-in");
                    }
                });
            }, { threshold: [0, 0.2] });
            cAnims.forEach(function (el) { cIO.observe(el); });
        }

        // the glass card's light follows the cursor (desktop)
        var cGlass = contact.querySelector(".contact-glass");
        if (cGlass && finePointer && !reduceMotion) {
            cGlass.addEventListener("pointermove", function (e) {
                var r = cGlass.getBoundingClientRect();
                cGlass.style.setProperty("--gx", (e.clientX - r.left) + "px");
                cGlass.style.setProperty("--gy", (e.clientY - r.top) + "px");
            });
        }
    })();

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