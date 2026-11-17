(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // true  = animations replay every time a section scrolls back into view
    // false = animations play once, then stay
    var REPLAY = true;

    // Tells the head failsafe that this script loaded.
    root.classList.add("js-enabled", "js-ready");

    // =========================================
    // HERO ENTRANCE
    // Two frames so the hidden state paints before the animation starts.
    // With REPLAY on, it resets once the hero is fully off screen and
    // plays again when you scroll back up to it.
    // =========================================
    var hero = document.getElementById("home");

    if (hero) {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                hero.classList.add("hero-ready");
            });
        });

        if (REPLAY && !reduceMotion && "IntersectionObserver" in window) {
            new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.intersectionRatio === 0) {
                            hero.classList.remove("hero-ready");
                        } else if (entry.intersectionRatio >= 0.3) {
                            hero.classList.add("hero-ready");
                        }
                    });
                },
                { threshold: [0, 0.3] }
            ).observe(hero);
        }
    }

    // =========================================
    // SCROLL REVEAL
    // Children of [data-reveal-group] reveal as individual items.
    // Items that enter view together are staggered by DOM order.
    // =========================================
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child) {
            child.setAttribute("data-reveal", "");
        });
    });

    var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    if (reduceMotion || !("IntersectionObserver" in window)) {
        revealTargets.forEach(function (el) {
            el.classList.add("is-visible");
        });
    } else {
        var revealObserver = new IntersectionObserver(
            function (entries, observer) {
                // Fully out of view: reset so it can animate again next time.
                if (REPLAY) {
                    entries.forEach(function (entry) {
                        if (entry.intersectionRatio === 0) {
                            entry.target.classList.remove("is-visible");
                        }
                    });
                }

                var entering = entries
                    .filter(function (entry) {
                        return entry.isIntersecting &&
                            entry.intersectionRatio >= 0.15 &&
                            !entry.target.classList.contains("is-visible");
                    })
                    .sort(function (a, b) {
                        return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
                    });

                // Items entering together are staggered by DOM order.
                entering.forEach(function (entry, index) {
                    entry.target.style.setProperty("--reveal-delay", Math.min(index, 5) * 90 + "ms");
                    entry.target.classList.add("is-visible");
                    if (!REPLAY) {
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: [0, 0.15], rootMargin: "0px 0px -8% 0px" }
        );

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    }

    // =========================================
    // ACTIVE SECTION IN NAVIGATION
    // =========================================
    var navLinks = document.querySelectorAll(".nav-link");
    var sectionIds = ["home", "about", "skills", "projects", "contact"];

    function setActive(id) {
        navLinks.forEach(function (link) {
            if (link.getAttribute("href") === "#" + id) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    if ("IntersectionObserver" in window) {
        var spy = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        setActive(entry.target.id);
                    }
                });
            },
            { rootMargin: "-45% 0px -50% 0px" }
        );

        sectionIds.forEach(function (id) {
            var section = document.getElementById(id);
            if (section) {
                spy.observe(section);
            }
        });
    }

    // =========================================
    // MOBILE NAVIGATION
    // =========================================
    var menuBtn = document.getElementById("menu-btn");
    var mobileMenu = document.getElementById("mobile-menu");

    if (menuBtn && mobileMenu) {

        function setMenu(open) {
            mobileMenu.classList.toggle("hidden", !open);
            mobileMenu.classList.toggle("flex", open);
            menuBtn.innerHTML = open ? "✕" : "☰";
            menuBtn.setAttribute("aria-expanded", String(open));
        }

        menuBtn.addEventListener("click", function () {
            setMenu(mobileMenu.classList.contains("hidden"));
        });

        // Close after choosing a link
        mobileMenu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                setMenu(false);
            });
        });

        // Close with Escape and return focus to the button
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !mobileMenu.classList.contains("hidden")) {
                setMenu(false);
                menuBtn.focus();
            }
        });
    }
})();