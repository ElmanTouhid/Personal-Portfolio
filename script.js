(function () {
    "use strict";

    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Tells the head failsafe that this script loaded.
    root.classList.add("js-enabled", "js-ready");

    // =========================================
    // HERO ENTRANCE
    // Two frames so the hidden state paints before the animation starts.
    // =========================================
    var hero = document.getElementById("home");

    if (hero) {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                hero.classList.add("hero-ready");
            });
        });
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
                var visible = entries
                    .filter(function (entry) { return entry.isIntersecting; })
                    .sort(function (a, b) {
                        return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
                    });

                visible.forEach(function (entry, index) {
                    entry.target.style.setProperty("--reveal-delay", Math.min(index, 5) * 90 + "ms");
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
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