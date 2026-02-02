"use client";

import { useEffect, useRef } from "react";
import "./styles.css";

export default function PostGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js"></script>

      <header class="topbar">
        <div class="topbar__left">
          <div class="brand">
            <div class="brand__dot" aria-hidden="true"></div>
            <div class="brand__text">VVBeauty Post Generator</div>
          </div>
          <div class="segmented" role="group" aria-label="Formaat kiezen">
            <button class="segmented__btn is-active" data-style="post" type="button">Instagram Post (1080×1080)</button>
            <button class="segmented__btn" data-style="story" type="button">Instagram Story (1080×1920)</button>
          </div>
        </div>
        <div class="topbar__right">
          <button class="btn btn--ghost" id="btnReset" type="button">Reset naar template</button>
          <button class="btn btn--primary" id="btnExport" type="button">Exporteer als afbeelding</button>
        </div>
      </header>

      <main class="layout">
        <aside class="panel">
          <h2 class="panel__title">Content</h2>
          <p class="panel__hint">
            Vul je eigen tekst in. Gebruik <code>&lt;strong&gt;…&lt;/strong&gt;</code> voor roze accent<br>
            en <code>&lt;em&gt;…&lt;/em&gt;</code> voor cursief. Regels blijven behouden.
          </p>

          <div class="panel__scroll">
            <!-- HERO -->
            <div class="field">
              <label class="field__label" for="heroTitleInput">Hoofdtitel (bovenin)</label>
              <input class="field__input" id="heroTitleInput" type="text" value="LUXE GLOW" />
              <div class="field__slider">
                <label class="field__sliderLabel" for="heroTitleSize">Grootte</label>
                <input class="field__range" id="heroTitleSize" type="range" min="80" max="220" step="1" value="124" />
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="heroSubtitleInput">Ondertitel</label>
              <input class="field__input" id="heroSubtitleInput" type="text" value="Jouw moment om te schitteren" />
              <div class="field__slider">
                <label class="field__sliderLabel" for="heroSubtitleSize">Grootte</label>
                <input class="field__range" id="heroSubtitleSize" type="range" min="18" max="56" step="1" value="28" />
              </div>
            </div>

            <hr class="panel__hr" />

            <!-- CARD -->
            <div class="field">
              <label class="field__label" for="cardTitleInput">Titel in kader</label>
              <input class="field__input" id="cardTitleInput" type="text" value="EXCLUSIEVE BEAUTY" />
              <div class="field__slider">
                <label class="field__sliderLabel" for="cardTitleSize">Grootte</label>
                <input class="field__range" id="cardTitleSize" type="range" min="48" max="160" step="1" value="82" />
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="cardBodyInput">Hoofdtekst (kader)</label>
              <textarea class="field__input field__input--area" id="cardBodyInput" rows="8">✨ Creëer je droomlook
<strong>premium behandelingen</strong>

• Gelnagels
• Lash lift & brow lamination
• Wenkbrauw sculpting

Boek nu!</textarea>
              <div class="field__help">
                <strong>Strong</strong> = roze accent · <em>Em</em> = cursief · Enter = nieuwe regel
              </div>
              <div class="field__slider">
                <label class="field__sliderLabel" for="cardBodySize">Grootte</label>
                <input class="field__range" id="cardBodySize" type="range" min="16" max="42" step="1" value="24" />
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="cardNoteInput">Kleine noot onderaan kader</label>
              <textarea class="field__input field__input--area" id="cardNoteInput" rows="2"><em>Langdurig • Veilig • Op afspraak</em></textarea>
              <div class="field__slider">
                <label class="field__sliderLabel" for="cardNoteSize">Grootte</label>
                <input class="field__range" id="cardNoteSize" type="range" min="14" max="34" step="1" value="18" />
              </div>
            </div>

            <hr class="panel__hr" />

            <h2 class="panel__title">Logo & positie</h2>

            <div class="field">
              <label class="field__label" for="logoSize">Logo grootte</label>
              <div class="field__slider">
                <label class="field__sliderLabel" for="logoSize">px</label>
                <input class="field__range" id="logoSize" type="range" min="140" max="520" step="1" value="300" />
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="logoOffsetY">Logo Y-positie</label>
              <div class="field__slider">
                <label class="field__sliderLabel" for="logoOffsetY">px</label>
                <input class="field__range" id="logoOffsetY" type="range" min="-400" max="400" step="1" value="-40" />
              </div>
              <div class="field__help">Negatief = omhoog · positief = omlaag</div>
            </div>

            <h2 class="panel__title">Export</h2>
            <div class="field">
              <label class="field__label" for="exportFilenameInput">Bestandsnaam (geen .png)</label>
              <input class="field__input" id="exportFilenameInput" type="text" value="luxe-glow-post" />
              <div class="field__help">Bijvoorbeeld: valentijn-bring-a-friend of story-glow-duo</div>
            </div>
          </div>

          <div class="panel__bottom">
            <button class="btn btn--primary btn--block" id="btnExportBottom" type="button">Exporteer als afbeelding</button>
          </div>
        </aside>

        <section class="preview">
          <div class="preview__frame" id="previewFrame">
            <div class="igChrome igChrome--top" aria-hidden="true"></div>
            <div class="igChrome igChrome--bottom" aria-hidden="true"></div>

            <div class="canvasWrap" id="canvasWrap">
              <div class="canvas" id="exportTarget" data-style="post" aria-label="Voorbeeld canvas">
                <div class="marble" aria-hidden="true"></div>

                <div class="canvas__inner">
                  <div class="hero">
                    <div class="hero__title" id="heroTitlePreview">LUXE GLOW</div>
                    <div class="hero__subtitle" id="heroSubtitlePreview">Jouw moment om te schitteren</div>
                  </div>

                  <div class="divider divider--top" aria-hidden="true"></div>

                  <div class="card" id="card">
                    <div class="card__title" id="cardTitlePreview">EXCLUSIEVE BEAUTY</div>
                    <div class="card__body" id="cardBodyPreview">
                      ✨ Creëer je droomlook
<strong>premium behandelingen</strong>

• Gelnagels
• Lash lift & brow lamination
• Wenkbrauw sculpting

Boek nu!
                    </div>
                    <div class="card__note" id="cardNotePreview">
                      <em>Langdurig • Veilig • Op afspraak</em>
                    </div>
                  </div>

                  <div class="divider divider--bottom" aria-hidden="true"></div>

                  <div class="brandMark" id="brandMark">
                    <img src="/admin/postgen/logo.png" alt="VVBeauty logo" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p class="preview__note">
            Preview schaalt automatisch — export is altijd exact 1080×1080 of 1080×1920 px.
          </p>
        </section>
      </main>
    `;

    containerRef.current.appendChild(wrapper);

    // Inject and run JavaScript – NO unescaped backticks inside template literals
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        const $ = function(id) { return document.getElementById(id); };

        const exportTarget     = $("exportTarget");
        const previewFrame     = $("previewFrame");

        if (!exportTarget || !previewFrame) {
          console.error("Cannot initialize: exportTarget or previewFrame missing");
          return;
        }

        const btnExport        = $("btnExport");
        const btnExportBottom  = $("btnExportBottom");
        const btnReset         = $("btnReset");
        const styleButtons     = Array.from(document.querySelectorAll(".segmented__btn[data-style]"));

        const heroTitleInput   = $("heroTitleInput");
        const heroSubtitleInput= $("heroSubtitleInput");
        const cardTitleInput   = $("cardTitleInput");
        const cardBodyInput    = $("cardBodyInput");
        const cardNoteInput    = $("cardNoteInput");
        const exportFilenameInput = $("exportFilenameInput");

        const heroTitleSize    = $("heroTitleSize");
        const heroSubtitleSize = $("heroSubtitleSize");
        const cardTitleSize    = $("cardTitleSize");
        const cardBodySize     = $("cardBodySize");
        const cardNoteSize     = $("cardNoteSize");
        const logoSize         = $("logoSize");
        const logoOffsetY      = $("logoOffsetY");

        const heroTitlePreview   = $("heroTitlePreview");
        const heroSubtitlePreview = $("heroSubtitlePreview");
        const cardTitlePreview   = $("cardTitlePreview");
        const cardBodyPreview    = $("cardBodyPreview");
        const cardNotePreview    = $("cardNotePreview");

        const STORAGE_KEY = 'vvbeauty-post-generator-state-v1';

        const defaults = {
          post: {
            heroTitleInput: "LUXE GLOW",
            heroSubtitleInput: "Jouw moment om te schitteren",
            cardTitleInput: "EXCLUSIEVE BEAUTY",
            cardBodyInput:
              "✨ Creëer je droomlook\\n" +
              "<strong>premium behandelingen</strong>\\n\\n" +
              "• Gelnagels\\n" +
              "• Lash lift & brow lamination\\n" +
              "• Wenkbrauw sculpting\\n\\n" +
              "Boek nu!",
            cardNoteInput: "<em>Langdurig • Veilig • Op afspraak</em>",
            exportFilenameInput: "luxe-glow-post",
            sizes: { heroTitle: 124, heroSubtitle: 28, cardTitle: 82, cardBody: 24, cardNote: 18, logoSize: 300, logoOffsetY: -50 }
          },
          story: {
            heroTitleInput: "GLOW UP",
            heroSubtitleInput: "Stralen begint hier",
            cardTitleInput: "PREMIUM MOMENT",
            cardBodyInput:
              "✨ Jouw perfecte look\\n" +
              "<strong>nu boeken</strong>\\n\\n" +
              "• Gelnagels & extensions\\n" +
              "• Lash lift + tint\\n" +
              "• Brow sculpt & henna\\n\\n" +
              "Beperkte plekken!",
            cardNoteInput: "<em>Alleen op afspraak • Luxe resultaat</em>",
            exportFilenameInput: "glow-up-story",
            sizes: { heroTitle: 118, heroSubtitle: 28, cardTitle: 78, cardBody: 24, cardNote: 18, logoSize: 260, logoOffsetY: -20 }
          }
        };

        function getCurrentState() {
          return {
            style: exportTarget.dataset.style || 'post',
            heroTitleInput: heroTitleInput.value,
            heroSubtitleInput: heroSubtitleInput.value,
            cardTitleInput: cardTitleInput.value,
            cardBodyInput: cardBodyInput.value,
            cardNoteInput: cardNoteInput.value,
            exportFilenameInput: exportFilenameInput.value,
            heroTitleSize: heroTitleSize.value,
            heroSubtitleSize: heroSubtitleSize.value,
            cardTitleSize: cardTitleSize.value,
            cardBodySize: cardBodySize.value,
            cardNoteSize: cardNoteSize.value,
            logoSize: logoSize.value,
            logoOffsetY: logoOffsetY.value,
            timestamp: Date.now()
          };
        }

        function loadSavedState(saved) {
          if (!saved) return false;
          if (saved.style) {
            setActiveStyleButton(saved.style);
            setStyleClass(saved.style);
            setCanvasSize(saved.style);
          }
          heroTitleInput.value    = saved.heroTitleInput    ?? '';
          heroSubtitleInput.value = saved.heroSubtitleInput ?? '';
          cardTitleInput.value    = saved.cardTitleInput    ?? '';
          cardBodyInput.value     = saved.cardBodyInput     ?? '';
          cardNoteInput.value     = saved.cardNoteInput     ?? '';
          exportFilenameInput.value = saved.exportFilenameInput ?? 'vvbeauty';
          heroTitleSize.value     = saved.heroTitleSize     ?? '124';
          heroSubtitleSize.value  = saved.heroSubtitleSize  ?? '28';
          cardTitleSize.value     = saved.cardTitleSize     ?? '82';
          cardBodySize.value      = saved.cardBodySize      ?? '24';
          cardNoteSize.value      = saved.cardNoteSize      ?? '18';
          logoSize.value          = saved.logoSize          ?? '300';
          logoOffsetY.value       = saved.logoOffsetY       ?? '-40';
          updateTypography();
          updatePreviewText();
          computePreviewScale();
          return true;
        }

        function saveState() {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentState()));
        }

        function loadStateOnInit() {
          const savedRaw = localStorage.getItem(STORAGE_KEY);
          if (!savedRaw) return false;
          try {
            const saved = JSON.parse(savedRaw);
            const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
            if (saved.timestamp && Date.now() - saved.timestamp > THIRTY_DAYS) {
              localStorage.removeItem(STORAGE_KEY);
              return false;
            }
            return loadSavedState(saved);
          } catch (e) {
            console.warn('Invalid saved state', e);
            localStorage.removeItem(STORAGE_KEY);
            return false;
          }
        }

        function bindPersistence() {
          const inputs = [
            heroTitleInput, heroSubtitleInput, cardTitleInput, cardBodyInput,
            cardNoteInput, exportFilenameInput,
            heroTitleSize, heroSubtitleSize, cardTitleSize, cardBodySize,
            cardNoteSize, logoSize, logoOffsetY
          ];
          inputs.forEach(function(el) {
            if (el) {
              el.addEventListener('input', saveState);
              el.addEventListener('change', saveState);
            }
          });
        }

        function setActiveStyleButton(style) {
          styleButtons.forEach(function(btn) {
            btn.classList.toggle("is-active", btn.dataset.style === style);
          });
        }

        function setCanvasSize(style) {
          const root = document.documentElement;
          if (style === "story") {
            root.style.setProperty("--canvas-w", "1080px");
            root.style.setProperty("--canvas-h", "1920px");
            exportTarget.dataset.style = "story";
          } else {
            root.style.setProperty("--canvas-w", "1080px");
            root.style.setProperty("--canvas-h", "1080px");
            exportTarget.dataset.style = "post";
          }
        }

        function getInnerBox(el) {
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            width: Math.max(0, rect.width - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0")),
            height: Math.max(0, rect.height - parseFloat(cs.paddingTop || "0") - parseFloat(cs.paddingBottom || "0"))
          };
        }

        function computePreviewScale() {
          if (!previewFrame) return;
          const inner = getInnerBox(previewFrame);
          const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--canvas-w")) || 1080;
          const h = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--canvas-h")) || 1080;
          const pad = 40;
          const maxW = Math.max(200, inner.width - pad * 2);
          const maxH = Math.max(200, inner.height - pad * 2);
          let scale = Math.min(maxW / w, maxH / h);
          scale = Math.min(scale, 1.0);
          scale = Math.max(scale, 0.08);
          document.documentElement.style.setProperty("--preview-scale", scale.toFixed(4));
        }

        function sanitizeRichText(raw) {
          let text = String(raw ?? "").replace(/\\r\\n|\\r|\\n/g, "<br/>");
          const tpl = document.createElement("template");
          tpl.innerHTML = text;
          const allowed = new Set(["STRONG", "EM", "BR"]);
          const walk = function(node) {
            Array.from(node.childNodes).forEach(function(child) {
              if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child;
                if (!allowed.has(el.tagName)) {
                  const frag = document.createDocumentFragment();
                  while (el.firstChild) frag.appendChild(el.firstChild);
                  el.replaceWith(frag);
                } else {
                  Array.from(el.attributes).forEach(function(a) { el.removeAttribute(a.name); });
                  walk(el);
                }
              } else if (child.nodeType !== Node.TEXT_NODE) {
                child.remove();
              }
            });
          };
          walk(tpl.content);
          return tpl.innerHTML;
        }

        function setCSSVar(name, value) {
          document.documentElement.style.setProperty(name, value + "px");
        }

        function setStyleClass(style) {
          if (previewFrame) previewFrame.classList.toggle("is-story", style === "story");
        }

        function updateTypography() {
          setCSSVar("--hero-title-size", heroTitleSize.value);
          setCSSVar("--hero-subtitle-size", heroSubtitleSize.value);
          setCSSVar("--card-title-size", cardTitleSize.value);
          setCSSVar("--card-body-size", cardBodySize.value);
          setCSSVar("--card-note-size", cardNoteSize.value);
          setCSSVar("--logo-size", logoSize.value);
          setCSSVar("--logo-offset-y", logoOffsetY.value);
        }

        function updatePreviewText() {
          if (heroTitlePreview)    heroTitlePreview.textContent = heroTitleInput.value || "";
          if (heroSubtitlePreview) heroSubtitlePreview.textContent = heroSubtitleInput.value || "";
          if (cardTitlePreview)    cardTitlePreview.textContent = cardTitleInput.value || "";
          if (cardBodyPreview)     cardBodyPreview.innerHTML = sanitizeRichText(cardBodyInput.value || "");
          if (cardNotePreview)     cardNotePreview.innerHTML = sanitizeRichText(cardNoteInput.value || "");
        }

        function applyTemplate(style) {
          const tpl = defaults[style] || defaults.post;
          heroTitleInput.value    = tpl.heroTitleInput;
          heroSubtitleInput.value = tpl.heroSubtitleInput;
          cardTitleInput.value    = tpl.cardTitleInput;
          cardBodyInput.value     = tpl.cardBodyInput;
          cardNoteInput.value     = tpl.cardNoteInput;
          exportFilenameInput.value = tpl.exportFilenameInput;
          heroTitleSize.value     = tpl.sizes.heroTitle;
          heroSubtitleSize.value  = tpl.sizes.heroSubtitle;
          cardTitleSize.value     = tpl.sizes.cardTitle;
          cardBodySize.value      = tpl.sizes.cardBody;
          cardNoteSize.value      = tpl.sizes.cardNote;
          logoSize.value          = tpl.sizes.logoSize ?? 280;
          logoOffsetY.value       = tpl.sizes.logoOffsetY ?? -30;
          updateTypography();
          updatePreviewText();
        }

        function getSafeFilename() {
          const raw = (exportFilenameInput && exportFilenameInput.value || "vvbeauty").trim();
          return raw
            .toLowerCase()
            .replace(/\\s+/g, "-")
            .replace(/[^a-z0-9-_]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            || "vvbeauty-export";
        }

        async function exportAsPNG() {
          const isStory = exportTarget.dataset.style === "story";
          const w = 1080;
          const h = isStory ? 1920 : 1080;

          const host = document.createElement("div");
          host.style.cssText = "position:fixed;left:-9999px;top:0;width:" + w + "px;height:" + h + "px;overflow:hidden;background:transparent;pointer-events:none;z-index:-1;";

          const clone = exportTarget.cloneNode(true);
          clone.style.cssText = "transform:none !important;box-shadow:none !important;width:" + w + "px !important;height:" + h + "px !important;margin:0 !important;position:absolute;left:0;top:0;background:transparent !important;";

          const styleEl = document.createElement("style");
          styleEl.textContent = 
            "* { font-size: 98% !important; line-height: 0.98 !important; }" +
            ".hero__title { font-size: calc(var(--hero-title-size) * 0.98) !important; }" +
            ".hero__subtitle { font-size: calc(var(--hero-subtitle-size) * 0.98) !important; }" +
            ".card__title { font-size: calc(var(--card-title-size) * 0.98) !important; }" +
            ".card__body { font-size: calc(var(--card-body-size) * 0.98) !important; }" +
            ".card__note { font-size: calc(var(--card-note-size) * 0.98) !important; }";
          clone.appendChild(styleEl);

          host.appendChild(clone);
          document.body.appendChild(host);

          await new Promise(function(r) { setTimeout(r, 500); });

          try {
            const dataUrl = await domtoimage.toPng(clone, {
              width: w,
              height: h,
              bgcolor: "#fbf8f9",
              style: { "-webkit-font-smoothing": "antialiased", "font-smooth": "always" },
              quality: 1,
              cacheBust: true
            });

            const link = document.createElement("a");
            link.download = getSafeFilename() + ".png";
            link.href = dataUrl;
            link.click();
            link.remove();
          } catch (err) {
            console.error("Export failed:", err);
            alert("Exporteren mislukt — check de console (F12) voor details.");
          } finally {
            host.remove();
          }
        }

        function switchStyle(style) {
          const s = style === "story" ? "story" : "post";
          setActiveStyleButton(s);
          setStyleClass(s);
          setCanvasSize(s);
          setTimeout(computePreviewScale, 60);
          saveState();
        }

        function bindEvents() {
          styleButtons.forEach(function(btn) {
            btn.addEventListener("click", function() { switchStyle(btn.dataset.style); });
          });

          [heroTitleInput, heroSubtitleInput, cardTitleInput, cardBodyInput, cardNoteInput]
            .forEach(function(el) {
              if (el) el.addEventListener("input", updatePreviewText);
            });

          [heroTitleSize, heroSubtitleSize, cardTitleSize, cardBodySize, cardNoteSize, logoSize, logoOffsetY]
            .forEach(function(el) {
              if (el) el.addEventListener("input", function() {
                updateTypography();
                computePreviewScale();
              });
            });

          if (btnReset) {
            btnReset.addEventListener("click", function() {
              const current = exportTarget.dataset.style || "post";
              applyTemplate(current);
              computePreviewScale();
              saveState();
            });
          }

          if (btnExport) btnExport.addEventListener("click", exportAsPNG);
          if (btnExportBottom) btnExportBottom.addEventListener("click", exportAsPNG);

          window.addEventListener("resize", computePreviewScale);
        }

        function init() {
          console.log("VVBeauty Post Generator initialized");
          bindEvents();
          bindPersistence();
          const hasLoadedSaved = loadStateOnInit();
          if (!hasLoadedSaved) {
            switchStyle("post");
            applyTemplate("post");
          }
          setTimeout(function() {
            updateTypography();
            updatePreviewText();
            computePreviewScale();
          }, 120);
        }

        // Slightly delayed init for DOM readiness
        setTimeout(init, 150);
      })();
    `;

    wrapper.appendChild(script);

    return function cleanup() {
      if (containerRef.current && wrapper.parentNode) {
        containerRef.current.removeChild(wrapper);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="postgen-container"
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
      }}
    />
  );
}