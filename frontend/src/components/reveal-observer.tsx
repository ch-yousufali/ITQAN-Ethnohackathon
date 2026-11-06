"use client";

import { useEffect } from "react";

/**
 * Marks any `data-reveal` element with `data-shown` once it scrolls into view, and
 * globals.css does the animating. It watches the page for new elements too, because
 * routes change and data arrives after the first render.
 */
export function RevealObserver() {
  useEffect(() => {
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          intersection.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    const watch = (root: ParentNode) => {
      root.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => intersection.observe(el));
    };

    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches("[data-reveal]:not([data-shown])")) intersection.observe(node);
          watch(node);
        }
      }
    });

    // Wait a moment, as changing attributes on a page React is still hydrating causes a mismatch.
    const start = setTimeout(() => {
      watch(document);
      mutation.observe(document.body, { childList: true, subtree: true });
    }, 250);
    return () => {
      clearTimeout(start);
      mutation.disconnect();
      intersection.disconnect();
    };
  }, []);

  return null;
}
