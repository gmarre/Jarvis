/**
 * SopraWebApp — screen shell.
 *
 * The screens are reproduced at their exact design size (1440 x 900). This
 * script keeps them that way: at 1:1 when the window is big enough, scaled
 * down proportionally when it is not, so the layout never reflows and the
 * rendering always matches the Claude Design source.
 */
(function () {
  "use strict";

  var PAD = 32; // .stage padding, both sides

  var stage = document.querySelector(".screen-page .stage");
  var frame = stage && stage.querySelector(".frame");
  if (!frame) return;

  // Measured untransformed: 1440 x 900 plus the frame's 1px border.
  var DESIGN_W = frame.offsetWidth;
  var DESIGN_H = frame.offsetHeight;

  var chrome = document.querySelector(".chrome");
  var toggle = document.querySelector("[data-zoom-toggle]");
  var fit = localStorage.getItem("spa:fit") !== "off";

  function apply() {
    var scale = 1;
    if (fit) {
      scale = Math.min(
        1,
        (window.innerWidth - PAD) / DESIGN_W,
        (window.innerHeight - PAD) / DESIGN_H
      );
    }
    if (scale >= 0.999) {
      frame.style.transform = "";
      stage.style.height = "";
    } else {
      frame.style.transform = "scale(" + scale + ")";
      // Collapse the stage to the scaled box so the page does not overflow.
      stage.style.height = DESIGN_H * scale + PAD + "px";
    }
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(fit));
      toggle.textContent = fit ? "Fit" : "100%";
      toggle.title = fit
        ? "Scaled to fit the window — click for 1:1"
        : "Rendering at 1:1 (1440 x 900) — click to fit the window";
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      fit = !fit;
      localStorage.setItem("spa:fit", fit ? "on" : "off");
      apply();
    });
  }

  window.addEventListener("resize", apply);
  apply();

  // Keyboard: ← / → walk the screens, G opens the gallery, H hides the chrome.
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    var links = chrome ? chrome.querySelectorAll("a.chrome-btn") : [];
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      var want = e.key === "ArrowLeft" ? "←" : "→";
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === want) {
          e.preventDefault();
          window.location.href = links[i].getAttribute("href");
          return;
        }
      }
    } else if (e.key === "g" || e.key === "G") {
      window.location.href = "../index.html";
    } else if (e.key === "h" || e.key === "H") {
      if (chrome) chrome.hidden = !chrome.hidden;
    }
  });
})();
