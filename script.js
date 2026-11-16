console.log("Elman's Portfolio is running!");

// Enable entrance animations only when JavaScript is available.
document.documentElement.classList.add("js-enabled");

// HERO ENTRANCE ANIMATION
const heroSection = document.getElementById("home");

if (heroSection && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(function () {
        heroSection.classList.add("hero-ready");
    });
} else if (heroSection) {
    heroSection.classList.add("hero-ready");
}

// MOBILE NAVIGATION
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");

// TOGGLE MENU
if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () {
        const isOpen = mobileMenu.classList.contains("hidden");

        if (isOpen) {
            mobileMenu.classList.remove("hidden");
            mobileMenu.classList.add("flex");
        } else {
            mobileMenu.classList.add("hidden");
            mobileMenu.classList.remove("flex");
        }

        const menuIsOpen = !mobileMenu.classList.contains("hidden");
        menuBtn.innerHTML = menuIsOpen ? "✕" : "☰";
        menuBtn.setAttribute("aria-expanded", menuIsOpen);
    });

    // CLOSE MENU AFTER CLICKING A LINK
    const mobileLinks = mobileMenu.querySelectorAll("a");

    mobileLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            mobileMenu.classList.add("hidden");
            mobileMenu.classList.remove("flex");

            menuBtn.innerHTML = "☰";
            menuBtn.setAttribute("aria-expanded", "false");
        });
    });
}