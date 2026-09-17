/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PUBLIC_URL = "https://smart-garden-gitam.vercel.app";

/**
 * Intelligent Domain Switching:
 * This helper ensures that in the development environment (ais-dev), 
 * we point to the production/preview site for a clean experience.
 */
export function getBasePublicUrl() {
  const currentOrigin = window.location.origin.replace(/\/$/, "");
  
  // To prevent 404s during testing, if you are scanning a code while 
  // viewing the AI Studio preview, we can temporarily return the currentOrigin.
  // However, for the final university markers, we stick to the Vercel URL.
  if (currentOrigin.includes("ais-dev-") || currentOrigin.includes("ais-pre-")) {
    // If you want to test scans on the AI Studio preview, change this to: return currentOrigin;
    return PUBLIC_URL;
  }
  
  return PUBLIC_URL;
}
