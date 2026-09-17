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
  
  // If we are on a specialized AI Studio development domain, use the Vercel production URL
  if (currentOrigin.includes("ais-dev-") || currentOrigin.includes("ais-pre-")) {
    return PUBLIC_URL;
  }
  
  // Otherwise, use the custom production URL as the primary target
  return PUBLIC_URL;
}
