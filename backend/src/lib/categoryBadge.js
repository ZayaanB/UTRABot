// backend/lib/categoryBadge.js
// CommonJS wrapper so index.js can require it

const BADGE_PUBLIC_PATH = {
  biodiversity: "/nft/biodiversity-badge.png",
  energy_saving: "/nft/energy-saving-badge.png",
  donation: "/nft/donation-badge.png",
  community_volunteering: "/nft/community-volunteering-badge-1.png",
  waste_reduction: "/nft/waste-reduction-badge.png",
  low_carbon_transport: "/nft/low-carbon-transport-badge.png",
};

function pickBadgeFromCategory(categoryRaw) {
  const s = String(categoryRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_]/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ");

  if (s.includes("biodiversity") || s.includes("habitat") || s.includes("tree") || s.includes("planting")) {
    return { key: "biodiversity", publicPath: BADGE_PUBLIC_PATH.biodiversity };
  }

  if (s.includes("energy") || s.includes("water") || s.includes("saving") || s.includes("efficiency")) {
    return { key: "energy_saving", publicPath: BADGE_PUBLIC_PATH.energy_saving };
  }

  if (s.includes("donation") || s.includes("donate") || s.includes("charity") || s.includes("fundraiser")) {
    return { key: "donation", publicPath: BADGE_PUBLIC_PATH.donation };
  }

  if (s.includes("community") || s.includes("volunteer") || s.includes("cleanup") || s.includes("volunteering")) {
    return { key: "community_volunteering", publicPath: BADGE_PUBLIC_PATH.community_volunteering };
  }

  if (
    s.includes("waste") ||
    s.includes("recycle") ||
    s.includes("recycling") ||
    s.includes("reuse") ||
    s.includes("reduction")
  ) {
    return { key: "waste_reduction", publicPath: BADGE_PUBLIC_PATH.waste_reduction };
  }

  if (
    s.includes("transport") ||
    s.includes("transit") ||
    s.includes("bike") ||
    s.includes("biking") ||
    s.includes("walk") ||
    s.includes("carpool") ||
    s.includes("low carbon")
  ) {
    return { key: "low_carbon_transport", publicPath: BADGE_PUBLIC_PATH.low_carbon_transport };
  }

  return { key: "waste_reduction", publicPath: BADGE_PUBLIC_PATH.waste_reduction };
}

module.exports = { pickBadgeFromCategory, BADGE_PUBLIC_PATH };